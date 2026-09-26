import test from "node:test";
import assert from "node:assert/strict";
import { createCoachHandler } from "../lib/coach.ts";
const env = {
  OPENROUTER_API_KEY: "test-key",
  ATTEMPT_SIGNING_SECRET: "x".repeat(32),
};
const initial = {
  courseId: "classical-genetics",
  questionId: "genotype-phenotype-1",
  localSessionId: "session",
  answer: "PP",
  explanation: "I guessed.",
};
function jev(supported = false) {
  const choice = (value, keys) => ({
    type: "choice",
    choice: value,
    confidence: 1,
    probabilities: Object.fromEntries(
      keys.map((k) => [k, k === value ? 1 : 0]),
    ),
  });
  return {
    answers: {
      pattern: choice(supported ? "sound-reasoning" : "insufficient-evidence", [
        "dominant-means-homozygous",
        "recessive-allele-disappears",
        "sound-reasoning",
        "unrelated-reasoning",
        "insufficient-evidence",
      ]),
      evidence: choice(supported ? "sufficient" : "insufficient", [
        "sufficient",
        "insufficient",
        "contradictory",
      ]),
    },
  };
}
const sound = {
  label: "sound-reasoning",
  evidence: "Pp can be purple.",
  reviewRequired: false,
  diagnosisSupported: true,
  feedbackText:
    "One dominant P can produce purple. Try the same idea in a different context.",
  sourceIds: ["genotype-phenotype-source"],
};
const next = (previous, explanation = "I am still unsure.") => ({
  answer: "Unsure",
  explanation,
  continuation: { state: previous.state, token: previous.continuationToken },
});
function setup(queue) {
  const calls = [],
    logs = [];
  const handler = createCoachHandler({
    env: () => env,
    log: (e) => logs.push(e),
    fetcher: async (url, init) => {
      calls.push(JSON.parse(init.body));
      const value = queue.shift();
      if (value instanceof Error) throw value;
      return Response.json(
        url.endsWith("/decisions")
          ? value
          : {
              choices: [
                {
                  finish_reason: "stop",
                  message: { content: JSON.stringify(value) },
                },
              ],
            },
      );
    },
  });
  return {
    calls,
    logs,
    send: async (body) => {
      const r = await handler(
        new Request("http://localhost/api/coach", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      );
      return { status: r.status, data: await r.json() };
    },
  };
}
test("uncertainty asks a grounded probe, uses its answer to reassess, then verifies", async () => {
  const app = setup([
    jev(),
    jev(true),
    sound,
    { status: "verified", reason: "Explains complete dominance." },
  ]);
  const first = (await app.send(initial)).data;
  assert.equal(first.state.phase, "clarify");
  assert.match(first.state.pending.prompt, /Pp/);
  assert.equal(first.lesson, null);
  const second = (await app.send(next(first, "Pp can be purple."))).data;
  assert.equal(
    app.calls[1].state.studentResponse.explanation,
    "Pp can be purple.",
  );
  assert.equal(second.state.phase, "verify");
  assert.equal(second.state.pending.id, "genotype-phenotype-2");
  assert.equal(
    app.calls[1].state.diagnosticDialogue[0].explanation,
    initial.explanation,
  );
  assert.equal(
    app.calls[1].state.diagnosticDialogue[1].explanation,
    "Pp can be purple.",
  );
  const last = (await app.send(next(second, "Rr can be red."))).data;
  assert.equal(last.state.result.status, "verified");
  assert.equal(last.state.phase, "complete");
  assert.equal(last.continuationToken, null);
  assert.ok(!JSON.stringify(last).includes("referenceAnswer"));
  assert.ok(!JSON.stringify(app.logs).includes("I guessed"));
});
test("repeated uncertainty gets two distinct probes then a sourced lesson, bounded retry and self-study plan", async () => {
  const app = setup([
    jev(),
    jev(),
    jev(),
    { status: "educatorReview", reason: "No relevant explanation yet." },
    { status: "needsPractice", reason: "Dominance is still confused." },
  ]);
  let data = (await app.send(initial)).data;
  const probe = data.state.pending.id;
  data = (await app.send(next(data))).data;
  assert.notEqual(data.state.pending.id, probe);
  assert.equal(data.state.phase, "clarify");
  data = (await app.send(next(data))).data;
  assert.equal(data.state.phase, "verify");
  assert.ok(data.lesson.steps.length);
  assert.equal(data.state.diagnosis.reviewRequired, true);
  data = (await app.send(next(data))).data;
  assert.equal(data.state.phase, "retry");
  assert.equal(data.state.result.status, "needsClarification");
  assert.ok(data.lesson.workedExample);
  data = (await app.send(next(data))).data;
  assert.equal(data.state.phase, "complete");
  assert.equal(data.state.result.status, "needsPractice");
  assert.equal(data.state.turns.length, 5);
  assert.ok(data.lesson);
  assert.ok(!JSON.stringify(data).match(/educator|teacher/i));
});
test("malformed input, tampered transcripts and stage skipping never call providers", async () => {
  const app = setup([jev()]);
  for (const body of [
    {},
    null,
    [],
    { ...initial, answer: " " },
    { ...initial, explanation: "x".repeat(4001) },
  ])
    assert.equal((await app.send(body)).status, 400);
  assert.equal(app.calls.length, 0);
  const first = (await app.send(initial)).data;
  const changed = next(first);
  changed.continuation.state.phase = "verify";
  assert.equal((await app.send(changed)).status, 400);
  assert.equal(app.calls.length, 1);
});
test("provider failures stay visible and fallback remains disclosed", async () => {
  const app = setup([
    new Error("offline"),
    {
      ...sound,
      evidence: "I guessed.",
      label: "insufficient-evidence",
      reviewRequired: true,
      diagnosisSupported: false,
      feedbackText: null,
      sourceIds: [],
    },
  ]);
  const { data } = await app.send(initial);
  assert.equal(data.state.phase, "clarify");
  assert.equal(data.state.diagnosis.decisionProvider, "generative-baseline");
  const broken = setup([new Error("offline"), new Error("offline")]);
  assert.equal((await broken.send(initial)).status, 502);
});

test("an uncertain candidate guides probe selection without becoming a diagnosis", async () => {
  const decision = jev();
  decision.answers.pattern.choice = "recessive-allele-disappears";
  for (const label of Object.keys(decision.answers.pattern.probabilities))
    decision.answers.pattern.probabilities[label] =
      label === "recessive-allele-disappears" ? 1 : 0;
  const { data } = await setup([decision]).send(initial);
  assert.equal(data.state.pending.id, "genotype-phenotype-1-probe-2");
  assert.equal(data.state.diagnosis.label, "insufficient-evidence");
  assert.equal(data.state.diagnosis.reviewRequired, true);
});
test("generated teacher handoffs fail visibly instead of entering the learning loop", async () => {
  const app = setup([
    jev(true),
    {
      ...sound,
      evidence: "I guessed.",
      feedbackText: "Ask your teacher to explain this concept.",
    },
  ]);
  assert.equal((await app.send(initial)).status, 502);
});
