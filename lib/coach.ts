import "server-only";
import { randomUUID } from "node:crypto";
import type {
  CoachResponse,
  CoachState,
  DecisionProvider,
  DialogueTurn,
} from "./contracts";
import { INPUT_LIMITS } from "./contracts";
import { getCourse, getQuestion, getVerificationQuestion } from "./course";
import { getKnowledge, KNOWLEDGE_VERSION, selectProbe } from "./knowledge";
import { classifyWithJev } from "./jev";
import { generateAssessment, generateVerification } from "./feedback";
import {
  ConfigurationError,
  loadConfig,
  ProviderError,
  safeModel,
} from "./openrouter";
import { InvalidRequestError, validateAnalyze } from "./validation";
import { InvalidAttemptError } from "./attempt";
import { openCoachState, sealCoachState } from "./coach-token";
import type { Assessment } from "./decision";

interface Dependencies {
  env?: () => NodeJS.ProcessEnv;
  fetcher?: typeof fetch;
  log?: (event: Record<string, unknown>) => void;
}
export function createCoachHandler(dependencies: Dependencies = {}) {
  return async function coach(request: Request): Promise<Response> {
    const requestId = randomUUID(),
      started = Date.now();
    let questionId: string | undefined;
    const emit = (event: Record<string, unknown>) => {
      try {
        (dependencies.log ?? ((e) => console.info(JSON.stringify(e))))({
          requestId,
          questionId,
          ...event,
        });
      } catch {
        /* diagnostics are not the learning path */
      }
    };
    const respond = (body: unknown, status = 200) =>
      Response.json(body, {
        status,
        headers: { "Cache-Control": "no-store", "X-Request-Id": requestId },
      });
    try {
      let body: Record<string, unknown>;
      try {
        const text = await request.text();
        if (text.length > 100000) throw new Error();
        body = JSON.parse(text);
        if (!body || typeof body !== "object" || Array.isArray(body))
          throw new Error();
      } catch {
        throw new InvalidRequestError(
          "Send a valid, bounded JSON coaching request.",
        );
      }
      const field = (key: "answer" | "explanation") => {
        const value = body[key];
        if (
          typeof value !== "string" ||
          !value.trim() ||
          value.trim().length > INPUT_LIMITS[key]
        )
          throw new InvalidRequestError(
            `${key} is required and must be at most ${INPUT_LIMITS[key]} characters.`,
          );
        return value.trim();
      };
      const answer = field("answer"),
        explanation = field("explanation");
      // Validate the full initial request before configuration or provider access.
      const initial =
        body.continuation === undefined ? validateAnalyze(body) : null;
      if (
        !initial &&
        (!body.continuation ||
          typeof body.continuation !== "object" ||
          Array.isArray(body.continuation))
      )
        throw new InvalidRequestError(
          "Provide the previous coaching continuation.",
        );
      const continuation = body.continuation as
        { state: unknown; token: unknown } | undefined;
      if (
        continuation &&
        (typeof continuation.token !== "string" ||
          !continuation.token.trim() ||
          continuation.token.length > 2048 ||
          !continuation.state)
      )
        throw new InvalidRequestError("Provide a valid coaching continuation.");
      const config = loadConfig((dependencies.env ?? (() => process.env))());
      let state: CoachState;
      if (initial) {
        const { question } = getQuestion(initial.courseId, initial.questionId);
        state = {
          version: 1,
          id: randomUUID(),
          courseId: initial.courseId,
          courseVersion: getCourse(initial.courseId).version,
          knowledgeVersion: KNOWLEDGE_VERSION,
          questionId: initial.questionId,
          localSessionId: initial.localSessionId,
          issuedAt: Math.floor(Date.now() / 1000),
          phase: "clarify",
          turns: [
            {
              kind: "initial",
              questionId: question.id,
              prompt: question.prompt,
              answer,
              explanation,
            },
          ],
          pending: null,
          diagnosis: null,
          feedback: null,
          result: null,
        };
      } else {
        state = openCoachState(
          continuation!.state,
          continuation!.token as string,
          config.signingSecret,
        );
        const pending = state.pending!;
        const turn: DialogueTurn = {
          kind: state.phase === "clarify" ? "probe" : "verification",
          questionId: pending.id,
          prompt: pending.prompt,
          answer,
          explanation,
        };
        state = { ...state, turns: [...state.turns, turn] };
      }
      questionId = state.questionId;
      const context = getQuestion(state.courseId, state.questionId);
      const knowledge = getKnowledge(context.concept.id);
      let message: string;
      let lesson: CoachResponse["lesson"] = null;
      if (!initial && (state.phase === "verify" || state.phase === "retry")) {
        const callStarted = Date.now();
        const verification = await generateVerification(
          {
            ...getQuestion(state.courseId, state.pending!.id),
            answer,
            explanation,
          },
          config,
          dependencies.fetcher,
        );
        emit({
          stage: "verification",
          model: safeModel(verification.model, config.generativeModel),
          latencyMs: Date.now() - callStarted,
          usage: verification.usage,
        });
        // Compatibility adapter's old enum means uncertainty, never a human handoff.
        const status =
          verification.status === "educatorReview"
            ? "needsClarification"
            : verification.status;
        if (
          /\b(?:ask|contact|consult|refer|discuss).{0,40}\b(?:teacher|educator|instructor)\b/i.test(
            verification.reason,
          )
        )
          throw new ProviderError("HUMAN_HANDOFF");
        state = { ...state, result: { status, reason: verification.reason } };
        if (status === "verified") {
          state = { ...state, phase: "complete", pending: null };
          message =
            "Your reasoning supports this check. Try another concept or return later to test recall.";
        } else if (state.phase === "verify") {
          state = { ...state, phase: "retry" };
          lesson = knowledge.lesson;
          message =
            status === "needsClarification"
              ? "Let’s make the reasoning explicit. Follow the worked example, then explain each step in this question."
              : "Let’s rebuild the missing step. Use this worked example, then retry the check in your own words.";
        } else {
          state = { ...state, phase: "complete", pending: null };
          lesson = knowledge.lesson;
          message =
            "Understanding is not established yet. Work through the steps below at your own pace, then start a fresh practice session. Nervon will keep guiding you.";
        }
      } else {
        // Anchor classification on the latest evidence; retain prior turns for corrections.
        const latest = state.turns[state.turns.length - 1];
        const assessmentContext = {
          ...context,
          answer: latest.answer,
          explanation: latest.explanation,
          ...(state.turns.length > 1
            ? {
                dialogue: state.turns.map((t) => ({
                  prompt: t.prompt,
                  answer: t.answer,
                  explanation: t.explanation,
                })),
              }
            : {}),
        };
        let provider: DecisionProvider = "jev";
        let decision: Awaited<ReturnType<typeof classifyWithJev>> | undefined;
        const callStarted = Date.now();
        try {
          decision = await classifyWithJev(
            assessmentContext,
            config,
            dependencies.fetcher,
          );
          emit({
            stage: "decision",
            model: safeModel(decision.model, config.jevModel),
            latencyMs: Date.now() - callStarted,
            distribution: decision.distribution,
            usage: decision.usage,
          });
        } catch (error) {
          if (!(error instanceof ProviderError)) throw error;
          provider = "generative-baseline";
          emit({
            stage: "decision",
            model: config.jevModel,
            outcome: "fallback",
            reason: error.reason,
          });
        }
        let assessment: Assessment;
        if (decision?.reviewRequired)
          assessment = {
            label: decision.label,
            evidence: explanation.slice(0, 400),
            reviewRequired: true,
            feedback: null,
          };
        else {
          const teachingStarted = Date.now();
          const generated = await generateAssessment(
            assessmentContext,
            config,
            decision?.label ?? null,
            dependencies.fetcher,
          );
          assessment = generated;
          emit({
            stage: "feedback",
            model: safeModel(generated.model, config.generativeModel),
            latencyMs: Date.now() - teachingStarted,
            usage: generated.usage,
          });
        }
        if (
          assessment.feedback &&
          /\b(?:ask|contact|consult|refer|discuss|speak|talk).{0,60}\b(?:teacher|educator|instructor)\b/i.test(
            assessment.feedback.text,
          )
        )
          throw new ProviderError("HUMAN_HANDOFF");
        state = {
          ...state,
          diagnosis: {
            label: assessment.label,
            evidence: assessment.evidence,
            reviewRequired: assessment.reviewRequired,
            decisionProvider: provider,
          },
          feedback: assessment.feedback,
        };
        const used = state.turns
          .filter((t) => t.kind === "probe")
          .map((t) => t.questionId);
        const probe =
          assessment.reviewRequired && used.length < 2
            ? selectProbe(
                state.questionId,
                used,
                decision?.distribution.pattern.choice ?? assessment.label,
              )
            : null;
        if (probe) {
          state = {
            ...state,
            phase: "clarify",
            pending: { id: probe.id, prompt: probe.prompt },
          };
          message =
            "I need one more piece of reasoning to distinguish the possible gaps. Let’s focus on this small question.";
        } else {
          state = {
            ...state,
            phase: "verify",
            pending: getVerificationQuestion(state.courseId, state.questionId),
          };
          if (assessment.reviewRequired) {
            lesson = knowledge.lesson;
            message =
              "The reasoning is still unclear, so I won’t assign a misconception. Let’s build from the fundamentals and try a different question.";
          } else
            message =
              "Reflect on the feedback, then apply the idea to a different question.";
        }
      }
      const result: CoachResponse = {
        state,
        message,
        lesson,
        continuationToken:
          state.phase === "complete"
            ? null
            : sealCoachState(state, config.signingSecret),
      };
      emit({
        stage: "complete",
        phase: state.phase,
        turns: state.turns.length,
        latencyMs: Date.now() - started,
      });
      return respond(result);
    } catch (error) {
      const status =
        error instanceof InvalidRequestError ||
        error instanceof InvalidAttemptError
          ? 400
          : error instanceof ProviderError
            ? 502
            : 500;
      const code =
        error instanceof InvalidAttemptError
          ? "INVALID_ATTEMPT"
          : status === 400
            ? "INVALID_REQUEST"
            : status === 502
              ? "PROVIDER_FAILURE"
              : "CONFIGURATION_ERROR";
      emit({
        stage: "error",
        code,
        reason: error instanceof ProviderError ? error.reason : undefined,
        latencyMs: Date.now() - started,
      });
      const message =
        error instanceof InvalidRequestError ||
        error instanceof InvalidAttemptError ||
        error instanceof ProviderError ||
        error instanceof ConfigurationError
          ? error.message
          : "The coaching service is unavailable. Please try again.";
      return respond({ error: { code, message } }, status);
    }
  };
}
