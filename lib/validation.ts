import "server-only";
import { INPUT_LIMITS } from "./contracts";
import type { AnalyzeRequest, VerifyRequest } from "./contracts";
import { getQuestion } from "./course";
export class InvalidRequestError extends Error {
  constructor(message = "Provide a valid course question, answer, explanation, and demo session ID.") { super(message); }
}
/** Verify has no session ID, so its default message names only the fields it requires. */
export class InvalidVerifyRequestError extends InvalidRequestError {
  constructor(message = "Provide a valid attempt token, question ID, answer, and explanation.") { super(message); }
}
export function validateAnalyze(value: unknown): AnalyzeRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InvalidRequestError();
  const data = value as Record<string, unknown>;
  const field = (key: string, max: number) => {
    if (typeof data[key] !== "string") throw new InvalidRequestError();
    const text = data[key].trim();
    if (!text || text.length > max) throw new InvalidRequestError(`${key} is required and must be at most ${max} characters.`);
    return text;
  };
  const courseId = field("courseId", 128);
  const questionId = field("questionId", 128);
  if (courseId !== "classical-genetics") throw new InvalidRequestError("Unknown course.");
  try { getQuestion(courseId, questionId); } catch { throw new InvalidRequestError("Unknown question."); }
  return {
    courseId, questionId, answer: field("answer", INPUT_LIMITS.answer),
    explanation: field("explanation", INPUT_LIMITS.explanation), localSessionId: field("localSessionId", INPUT_LIMITS.localSessionId),
  };
}

export function validateVerify(value: unknown): VerifyRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InvalidVerifyRequestError();
  const data = value as Record<string, unknown>;
  const field = (key: string, max: number) => {
    if (typeof data[key] !== "string") throw new InvalidVerifyRequestError();
    const text = data[key].trim();
    if (!text || text.length > max) throw new InvalidVerifyRequestError(`${key} is required and must be at most ${max} characters.`);
    return text;
  };
  
  return {
    attemptId: field("attemptId", INPUT_LIMITS.attemptId),
    nextQuestionId: field("nextQuestionId", 128),
    answer: field("answer", INPUT_LIMITS.answer),
    explanation: field("explanation", INPUT_LIMITS.explanation),
  };
}
