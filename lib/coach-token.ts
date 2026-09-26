import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { CoachState } from "./contracts";
import { ATTEMPT_TTL_SECONDS } from "./contracts";
import { getCourse, getQuestion } from "./course";
import { KNOWLEDGE_VERSION } from "./knowledge";
import { InvalidAttemptError } from "./attempt";
const digest = (state: unknown) =>
  createHash("sha256").update(JSON.stringify(state)).digest("base64url");
const signature = (payload: string, secret: string) =>
  createHmac("sha256", secret)
    .update("nervon-coach-v1:" + payload)
    .digest("base64url");
export function sealCoachState(state: CoachState, secret: string) {
  const payload = Buffer.from(
    JSON.stringify({
      version: 1,
      digest: digest(state),
      issuedAt: state.issuedAt,
      expiresAt: state.issuedAt + ATTEMPT_TTL_SECONDS,
    }),
  ).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}
export function openCoachState(
  value: unknown,
  token: string,
  secret: string,
  now = Math.floor(Date.now() / 1000),
): CoachState {
  try {
    if (JSON.stringify(value).length > 60000 || token.length > 2048)
      throw new Error();
    const [payload, sig, ...extra] = token.split(".");
    if (!payload || !sig || extra.length) throw new Error();
    const expected = Buffer.from(signature(payload, secret));
    const received = Buffer.from(sig);
    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    )
      throw new Error();
    const binding = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (
      binding.version !== 1 ||
      binding.digest !== digest(value) ||
      !Number.isSafeInteger(binding.issuedAt) ||
      binding.issuedAt > now ||
      binding.expiresAt <= now ||
      binding.expiresAt - binding.issuedAt !== ATTEMPT_TTL_SECONDS
    )
      throw new Error();
    // State was issued by this server and authenticated above; never trust unsigned client history.
    const state = value as CoachState;
    if (
      state.version !== 1 ||
      state.issuedAt !== binding.issuedAt ||
      state.courseId !== "classical-genetics" ||
      state.courseVersion !== getCourse(state.courseId).version ||
      state.knowledgeVersion !== KNOWLEDGE_VERSION ||
      !["clarify", "verify", "retry"].includes(state.phase) ||
      !state.pending ||
      !Array.isArray(state.turns) ||
      state.turns.length < 1 ||
      state.turns.length >= 5
    )
      throw new Error();
    getQuestion(state.courseId, state.questionId);
    return state;
  } catch {
    throw new InvalidAttemptError(
      "This coaching session has expired or changed. Start a new practice session.",
    );
  }
}
