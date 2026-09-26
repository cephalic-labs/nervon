import "server-only";
import { randomUUID } from "node:crypto";
import type { AnalyzeResponse, ApiError, DecisionProvider } from "./contracts";
import { getCourse, getQuestion, getVerificationQuestion } from "./course";
import type { Assessment } from "./decision";
import { classifyWithJev } from "./jev";
import { generateAssessment } from "./feedback";
import { ConfigurationError, loadConfig, ProviderError } from "./openrouter";
import { signAttempt } from "./attempt";
import { InvalidRequestError, validateAnalyze } from "./validation";

interface Dependencies {
  env?: () => NodeJS.ProcessEnv;
  fetcher?: typeof fetch;
  log?: (event: Record<string, unknown>) => void;
}
function safeModel(value: string, fallback: string) {
  return /^[a-zA-Z0-9_./:~+-]{1,200}$/.test(value) ? value : fallback;
}
export function createAnalyzeHandler(dependencies: Dependencies = {}) {
  return async function analyze(request: Request): Promise<Response> {
    const requestId = randomUUID();
    const started = Date.now();
    let questionId: string | undefined;
    let fallback = false;
    const emit = (event: Record<string, unknown>) => {
      // Diagnostics must not turn an otherwise valid model response into an error.
      try { (dependencies.log ?? console.info)({ requestId, questionId, fallback, ...event }); } catch { /* logging unavailable */ }
    };
    const respond = (body: AnalyzeResponse | ApiError, status: number) => Response.json(body, {
      status, headers: { "Cache-Control": "no-store", "X-Request-Id": requestId },
    });
    try {
      let raw: unknown;
      try { raw = await request.json(); } catch { throw new InvalidRequestError("Send a valid JSON request body."); }
      const input = validateAnalyze(raw);
      questionId = input.questionId;
      const config = loadConfig((dependencies.env ?? (() => process.env))());
      const context = { ...getQuestion(input.courseId, input.questionId), answer: input.answer, explanation: input.explanation };
      let decisionProvider: DecisionProvider = "jev";
      let assessment: Assessment;
      let decision: Awaited<ReturnType<typeof classifyWithJev>> | undefined;
      const decisionStarted = Date.now();
      try {
        decision = await classifyWithJev(context, config, dependencies.fetcher);
        emit({ stage: "decision", model: safeModel(decision.model, config.jevModel), latencyMs: Date.now() - decisionStarted, usage: decision.usage, distribution: decision.distribution });
      } catch (error) {
        if (!(error instanceof ProviderError)) throw error;
        fallback = true;
        decisionProvider = "generative-baseline";
        emit({ stage: "decision", model: config.jevModel, latencyMs: Date.now() - decisionStarted, outcome: "fallback", reason: error.reason, httpStatus: error.httpStatus });
      }
      if (decision?.reviewRequired) {
        assessment = { label: decision.label, evidence: input.explanation.slice(0, 400), reviewRequired: true, feedback: null };
      } else {
        const teachingStarted = Date.now();
        let generated;
        try {
          generated = await generateAssessment(context, config, decision?.label ?? null, dependencies.fetcher);
        } catch (error) {
          if (error instanceof ProviderError) emit({ stage: fallback ? "baseline" : "feedback", model: config.generativeModel, latencyMs: Date.now() - teachingStarted, outcome: "failed", reason: error.reason, httpStatus: error.httpStatus });
          throw error;
        }
        emit({ stage: fallback ? "baseline" : "feedback", model: safeModel(generated.model, config.generativeModel), latencyMs: Date.now() - teachingStarted, usage: generated.usage });
        assessment = generated;
      }
      const nextQuestion = assessment.reviewRequired ? null : getVerificationQuestion(input.courseId, input.questionId);
      const attemptId = signAttempt({
        courseId: input.courseId, coursePackVersion: getCourse(input.courseId).version,
        originalQuestionId: input.questionId, nextQuestionId: nextQuestion?.id ?? null, localSessionId: input.localSessionId,
      }, config.signingSecret);
      const base = { attemptId, conceptId: context.concept.id };
      const diagnosis = { label: assessment.label, evidence: assessment.evidence, decisionProvider };
      const result: AnalyzeResponse = assessment.reviewRequired
        ? { ...base, diagnosis: { ...diagnosis, reviewRequired: true }, feedback: null, nextQuestion: null }
        : { ...base, diagnosis: { ...diagnosis, reviewRequired: false }, feedback: assessment.feedback!, nextQuestion: nextQuestion! };
      emit({ stage: "complete", latencyMs: Date.now() - started, decisionProvider, reviewRequired: assessment.reviewRequired });
      return respond(result, 200);
    } catch (error) {
      const status = error instanceof InvalidRequestError ? 400 : error instanceof ProviderError ? 502 : 500;
      const code = status === 400 ? "INVALID_REQUEST" : status === 502 ? "PROVIDER_FAILURE" : "CONFIGURATION_ERROR";
      const message = error instanceof InvalidRequestError || error instanceof ProviderError || error instanceof ConfigurationError
        ? error.message : "Server configuration or course data is unavailable. Please contact the demo operator.";
      emit({ stage: "error", latencyMs: Date.now() - started, code });
      return respond({ error: { code, message } }, status);
    }
  };
}
