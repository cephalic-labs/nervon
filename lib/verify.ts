import "server-only";
import { randomUUID } from "node:crypto";
import type { ApiError, ApiErrorCode, VerifyResponse } from "./contracts";
import { getQuestion } from "./course";
import { InvalidAttemptError, verifyAttempt } from "./attempt";
import { generateVerification } from "./feedback";
import { ConfigurationError, loadConfig, ProviderError, safeModel } from "./openrouter";
import { InvalidRequestError, validateVerify } from "./validation";

interface Dependencies {
  env?: () => NodeJS.ProcessEnv;
  fetcher?: typeof fetch;
  log?: (event: Record<string, unknown>) => void;
}

/** Stateless verification: the signed attempt is the only proof, and replays are allowed until expiry. */
export function createVerifyHandler(dependencies: Dependencies = {}) {
  return async function verify(request: Request): Promise<Response> {
    const requestId = randomUUID();
    const started = Date.now();
    let questionId: string | undefined;
    const emit = (event: Record<string, unknown>) => {
      // Diagnostics must not turn an otherwise valid model response into an error.
      try { (dependencies.log ?? ((e: Record<string, unknown>) => console.info(JSON.stringify(e))))({ requestId, questionId, ...event }); } catch { /* logging unavailable */ }
    };
    const respond = (body: VerifyResponse | ApiError, status: number) => Response.json(body, {
      status, headers: { "Cache-Control": "no-store", "X-Request-Id": requestId },
    });
    try {
      let raw: unknown;
      try { raw = await request.json(); } catch { throw new InvalidRequestError("Send a valid JSON request body."); }
      const input = validateVerify(raw);
      questionId = input.nextQuestionId;
      const config = loadConfig((dependencies.env ?? (() => process.env))());
      // A review attempt carries no next question, so it can never satisfy this pairing.
      const binding = verifyAttempt(input.attemptId, config.signingSecret);
      if (!binding) throw new InvalidAttemptError();
      if (binding.nextQuestionId !== input.nextQuestionId) throw new InvalidAttemptError("This attempt is not assigned to the submitted question. Return to the previous result.");

      let context;
      try { context = getQuestion(binding.courseId, input.nextQuestionId); } catch { throw new InvalidRequestError("Unknown question."); }

      const startedCall = Date.now();
      let verification;
      try {
        verification = await generateVerification({ ...context, answer: input.answer, explanation: input.explanation }, config, dependencies.fetcher);
      } catch (error) {
        if (error instanceof ProviderError) emit({ stage: "verification", model: config.generativeModel, latencyMs: Date.now() - startedCall, outcome: "failed", reason: error.reason, httpStatus: error.httpStatus });
        throw error;
      }
      emit({ stage: "verification", model: safeModel(verification.model, config.generativeModel), latencyMs: Date.now() - startedCall, usage: verification.usage, status: verification.status });
      // Log-only fields stay out of the public body.
      const result: VerifyResponse = { status: verification.status, reason: verification.reason };
      emit({ stage: "complete", latencyMs: Date.now() - started, status: result.status });
      return respond(result, 200);
    } catch (error) {
      const status = error instanceof InvalidRequestError || error instanceof InvalidAttemptError ? 400
        : error instanceof ProviderError ? 502 : 500;
      const code: ApiErrorCode = error instanceof InvalidRequestError ? "INVALID_REQUEST"
        : error instanceof InvalidAttemptError ? "INVALID_ATTEMPT"
        : error instanceof ProviderError ? "PROVIDER_FAILURE" : "CONFIGURATION_ERROR";
      const message = error instanceof InvalidRequestError || error instanceof InvalidAttemptError || error instanceof ProviderError || error instanceof ConfigurationError
        ? error.message : "Server configuration or course data is unavailable. Please contact the demo operator.";
      emit({ stage: "error", latencyMs: Date.now() - started, code });
      return respond({ error: { code, message } }, status);
    }
  };
}
