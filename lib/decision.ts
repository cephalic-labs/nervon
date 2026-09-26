import type { getQuestion } from "./course";
import type { Feedback, VerificationStatus } from "./contracts";
import { ConfigurationError } from "./openrouter";
export type AssessmentContext = ReturnType<typeof getQuestion> & { answer: string; explanation: string };
export const VERIFICATION_STATUSES = ["verified", "needsPractice", "educatorReview"] as const;
export interface Assessment {
  label: string;
  evidence: string;
  reviewRequired: boolean;
  feedback: Feedback | null;
}
export const EVIDENCE_CRITERIA = {
  sufficient: "Relevant reasoning supports one rubric pattern without a contradiction. A correct final answer alone is not enough.",
  insufficient: "Reasoning is absent, unrelated, ambiguous, guessed, or too brief to assess.",
  contradictory: "Conflicting claims prevent a defensible diagnosis of the explanation.",
};
export function isReviewLabel(label: string) {
  return label === "insufficient-evidence" || label === "unrelated-reasoning";
}
export function modelContext(context: AssessmentContext) {
  return {
    question: context.question.prompt, referenceAnswer: context.question.referenceAnswer,
    requiredReasoning: context.question.requiredReasoning, diagnosticRubric: context.question.diagnosticRubric,
    studentResponse: { answer: context.answer, explanation: context.explanation },
  };
}

/** The pack's own verification rubric is the judging authority, so it must reach the model. */
export function verificationContext(context: AssessmentContext) {
  const rubric = context.question.verificationRubric as Record<string, unknown> | undefined;
  const verificationRubric = Object.fromEntries(VERIFICATION_STATUSES.map(status => {
    const criteria = typeof rubric?.[status] === "string" ? (rubric[status] as string).trim() : "";
    if (!criteria) throw new ConfigurationError();
    return [status, criteria];
  })) as Record<VerificationStatus, string>;
  return {
    question: context.question.prompt, referenceAnswer: context.question.referenceAnswer,
    requiredReasoning: context.question.requiredReasoning, verificationRubric,
    studentResponse: { answer: context.answer, explanation: context.explanation },
  };
}
