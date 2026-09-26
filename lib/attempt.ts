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

export function verifyAttempt(token: string, secret: string, now = Math.floor(Date.now() / 1000)): AttemptBinding | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadStr, signatureStr] = parts;
  
  const expectedSignature = createHmac("sha256", secret).update(payloadStr).digest("base64url");
  if (signatureStr !== expectedSignature) return null;
  
  try {
    const payload = JSON.parse(Buffer.from(payloadStr, "base64url").toString("utf-8"));
    if (payload.tokenVersion !== 1 || payload.courseId !== "classical-genetics") return null;
    if (payload.expiresAt < now) return null;
    return {
      courseId: payload.courseId,
      coursePackVersion: payload.coursePackVersion,
      originalQuestionId: payload.originalQuestionId,
      nextQuestionId: payload.nextQuestionId,
      localSessionId: payload.localSessionId,
    };
  } catch {
    return null;
  }
}
