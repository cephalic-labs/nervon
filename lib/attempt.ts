import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { ATTEMPT_TTL_SECONDS } from "./contracts";
import type { CourseId } from "./contracts";
export interface AttemptBinding {
  courseId: CourseId;
  coursePackVersion: string;
  originalQuestionId: string;
  nextQuestionId: string | null;
  localSessionId: string;
}
/** Safe, user-facing failure detail; never include token bytes or signature state. */
export class InvalidAttemptError extends Error {
  constructor(message = "Invalid or expired attempt token.") { super(message); }
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

function signatureMatches(received: string, expected: string) {
  const left = Buffer.from(received, "utf8");
  const right = Buffer.from(expected, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyAttempt(token: string, secret: string, now = Math.floor(Date.now() / 1000)): AttemptBinding | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadStr, signatureStr] = parts;

  const expectedSignature = createHmac("sha256", secret).update(payloadStr).digest("base64url");
  if (!signatureMatches(signatureStr, expectedSignature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadStr, "base64url").toString("utf-8"));
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
    if (payload.tokenVersion !== 1 || payload.courseId !== "classical-genetics") return null;
    if (typeof payload.coursePackVersion !== "string" || typeof payload.originalQuestionId !== "string") return null;
    if (typeof payload.localSessionId !== "string") return null;
    if (payload.nextQuestionId !== null && typeof payload.nextQuestionId !== "string") return null;
    if (!Number.isFinite(payload.issuedAt) || !Number.isFinite(payload.expiresAt)) return null;
    if (payload.expiresAt <= payload.issuedAt || payload.expiresAt < now) return null;
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
