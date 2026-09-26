import test from "node:test";
import assert from "node:assert/strict";
import { sealCoachState, openCoachState } from "../lib/coach-token.ts";
const secret = "test-secret-with-more-than-thirty-two-characters";
const state = {
  version: 1,
  id: "session-attempt",
  courseId: "classical-genetics",
  courseVersion: "1.0.0",
  knowledgeVersion: "1.0.0",
  questionId: "genotype-phenotype-1",
  localSessionId: "session",
  issuedAt: 100,
  phase: "clarify",
  turns: [
    {
      kind: "initial",
      questionId: "genotype-phenotype-1",
      prompt: "Question",
      answer: "PP",
      explanation: "I guessed.",
    },
  ],
  pending: { id: "genotype-phenotype-1-probe-1", prompt: "A probe" },
  diagnosis: null,
  feedback: null,
  result: null,
};
test("continuation binds transcript, phase and fixed expiry without placing student text in token", () => {
  const token = sealCoachState(state, secret);
  assert.deepEqual(openCoachState(state, token, secret, 101), state);
  const payload = JSON.parse(Buffer.from(token.split(".")[0], "base64url"));
  assert.deepEqual(Object.keys(payload).sort(), [
    "digest",
    "expiresAt",
    "issuedAt",
    "version",
  ]);
  assert.ok(!JSON.stringify(payload).includes("guessed"));
  for (const altered of [
    { ...state, phase: "verify" },
    { ...state, localSessionId: "other" },
    { ...state, turns: [] },
  ])
    assert.throws(() => openCoachState(altered, token, secret, 101));
  for (const now of [99, 7300])
    assert.throws(() => openCoachState(state, token, secret, now));
  assert.throws(() => openCoachState(state, token + "x", secret, 101));
  assert.throws(() => openCoachState(state, token, "wrong-key", 101));
  const stale = { ...state, knowledgeVersion: "0.1.0" };
  assert.throws(() =>
    openCoachState(stale, sealCoachState(stale, secret), secret, 101),
  );
});
