import type { getQuestion } from "./course";
import type { Feedback } from "./contracts";
export type AssessmentContext = ReturnType<typeof getQuestion> & { answer: string; explanation: string };
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
