import "server-only";
import { createHmac } from "node:crypto";
import { ATTEMPT_TTL_SECONDS } from "./contracts";
import type { CourseId } from "./contracts";
export interface AttemptBinding {
  courseId: CourseId;
  coursePackVersion: string;
  originalQuestionId: string;
  nextQuestionId: string | null;
  localSessionId: string;
}
/** Signing is not encryption. Only non-sensitive routing context goes here. */
export function signAttempt(binding: AttemptBinding, secret: string, issuedAt = Math.floor(Date.now() / 1000)) {
  const payload = Buffer.from(JSON.stringify({
    tokenVersion: 1, courseId: binding.courseId, coursePackVersion: binding.coursePackVersion,
    originalQuestionId: binding.originalQuestionId, nextQuestionId: binding.nextQuestionId,
    localSessionId: binding.localSessionId, issuedAt, expiresAt: issuedAt + ATTEMPT_TTL_SECONDS,
  })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}
