import "server-only";
import { INPUT_LIMITS } from "./contracts";
import type { AnalyzeRequest } from "./contracts";
import { getQuestion } from "./course";
export class InvalidRequestError extends Error {
  constructor(message = "Provide a valid course question, answer, explanation, and demo session ID.") { super(message); }
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
