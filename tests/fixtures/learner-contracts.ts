/** DEVELOPMENT ONLY: synthetic expectations, never live inference or valid tokens. */
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  ApiError,
  VerifyRequest,
  VerifyResponse,
} from "../../lib/contracts";

export const reasoningExamples = [
  { kind: "sound", questionId: "genotype-phenotype-1", answer: "PP or Pp", explanation: "P masks the recessive phenotype, so Pp is also purple; appearance cannot distinguish them.", expectedLabel: "sound-reasoning" },
  { kind: "misconception", questionId: "genotype-phenotype-1", answer: "PP only", explanation: "Purple is dominant, so both alleles must be P.", expectedLabel: "dominant-means-homozygous" },
  { kind: "unrelated", questionId: "genotype-phenotype-1", answer: "Purple", explanation: "Purple is my favorite color.", expectedLabel: "unrelated-reasoning" },
  { kind: "insufficient", questionId: "genotype-phenotype-1", answer: "PP or Pp", explanation: "I guessed.", expectedLabel: "insufficient-evidence" },
  { kind: "correct-answer-faulty-reasoning", questionId: "segregation-1", answer: "TT 1/4, Tt 1/2, tt 1/4", explanation: "Every gamete carries both T and t. I memorized those fractions.", expectedLabel: "gametes-retain-both-alleles" },
  { kind: "contradictory", questionId: "genotype-phenotype-1", answer: "PP or Pp", explanation: "Pp can be purple, but purple proves PP and rules out Pp.", expectedLabel: "insufficient-evidence" },
] as const;

export const analyzeRequest = {
  courseId: "classical-genetics",
  questionId: "genotype-phenotype-1",
  answer: reasoningExamples[1].answer,
  explanation: reasoningExamples[1].explanation,
  localSessionId: "synthetic-session-1",
} satisfies AnalyzeRequest;

export const supportedDiagnosis = {
  attemptId: "DEVELOPMENT_ONLY_NOT_A_SIGNED_TOKEN",
  conceptId: "genotype-phenotype",
  diagnosis: {
    label: "dominant-means-homozygous",
    evidence: "both alleles must be P",
    decisionProvider: "jev",
    reviewRequired: false,
  },
  feedback: {
    text: "Your explanation assumes purple flowers require two P alleles. Under complete dominance, Pp also gives purple flowers. Distinguish the observable trait from the possible allele combinations.",
    sourceIds: ["genotype-phenotype-source"],
  },
  nextQuestion: {
    id: "genotype-phenotype-2",
    prompt: "In a different synthetic diploid plant model, R gives red flowers and r gives white flowers, with complete dominance. A plant has red flowers. Which genotypes are possible, and could it still carry r? Explain.",
  },
} satisfies AnalyzeResponse;

export const uncertainty = {
  attemptId: "DEVELOPMENT_ONLY_REVIEW_TOKEN",
  conceptId: "genotype-phenotype",
  diagnosis: {
    label: "insufficient-evidence",
    evidence: "I guessed.",
    decisionProvider: "generative-baseline",
    reviewRequired: true,
  },
  feedback: null,
  nextQuestion: null,
} satisfies AnalyzeResponse;

export const verifyRequest = {
  attemptId: supportedDiagnosis.attemptId,
  nextQuestionId: supportedDiagnosis.nextQuestion.id,
  answer: "RR or Rr; it could contain r.",
  explanation: "Rr is red because R masks the recessive phenotype without removing r.",
} satisfies VerifyRequest;

export const verified = {
  status: "verified",
  reason: "Identifies RR and Rr and explains how r can remain present in a red-flowered heterozygote.",
} satisfies VerifyResponse;

export const apiError = {
  error: { code: "INVALID_REQUEST", message: "Please provide an explanation." },
} satisfies ApiError;
