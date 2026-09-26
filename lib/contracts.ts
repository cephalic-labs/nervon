/** Browser-safe contracts only. Never import private course JSON here. */
export type CourseId = "classical-genetics";
export type DecisionProvider = "jev" | "generative-baseline" | "laya";
export type VerificationStatus = "verified" | "needsPractice" | "educatorReview";

export interface PublicSource {
  id: string;
  text: string;
  title: string;
  url: string;
  attribution: string;
  license: string;
  licenseUrl: string;
  reviewStatus: "pending-educator-review";
}

export interface PublicQuestion {
  id: string;
  prompt: string;
  choices?: string[];
}

export interface PublicConcept {
  id: string;
  title: string;
  learningObjective: string;
  sources: PublicSource[];
  questions: PublicQuestion[];
}

export interface PublicCourse {
  schemaVersion: number;
  version: string;
  courseId: CourseId;
  title: string;
  disclosure: string;
  reviewStatus: "pending-educator-review";
  concepts: PublicConcept[];
}

export interface AnalyzeRequest {
  courseId: CourseId;
  questionId: string;
  answer: string;
  explanation: string;
  localSessionId: string;
}

export interface Feedback {
  text: string;
  sourceIds: string[];
}

interface Diagnosis {
  label: string;
  evidence: string;
  decisionProvider: DecisionProvider;
}

/** Review cases cannot carry confident teaching feedback or a next question. */
export type AnalyzeResponse = {
  attemptId: string;
  conceptId: string;
} & (
  | {
      diagnosis: Diagnosis & { reviewRequired: true };
      feedback: null;
      nextQuestion: null;
    }
  | {
      diagnosis: Diagnosis & { reviewRequired: false };
      feedback: Feedback;
      nextQuestion: PublicQuestion;
    }
);

export interface VerifyRequest {
  /** Opaque signed token from analyze; fixtures are never valid tokens. */
  attemptId: string;
  nextQuestionId: string;
  answer: string;
  explanation: string;
}

export interface VerifyResponse {
  status: VerificationStatus;
  reason: string;
}

export type ApiErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_ATTEMPT"
  | "PROVIDER_FAILURE"
  | "CONFIGURATION_ERROR";

export interface ApiError {
  error: { code: ApiErrorCode; message: string };
}

/** Character counts after trimming; enforce these at the future API boundary. */
export const INPUT_LIMITS = {
  answer: 2000,
  explanation: 4000,
  localSessionId: 128,
  attemptId: 4096,
} as const;

export const ATTEMPT_TTL_SECONDS = 2 * 60 * 60;
