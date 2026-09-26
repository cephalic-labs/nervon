/** Explicit live synthetic diagnostic-conversation check. Never part of npm test. */
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const base = new URL(
  process.env.NERVON_SMOKE_BASE_URL ?? "http://localhost:3000",
);
if (!["localhost", "127.0.0.1", "[::1]"].includes(base.hostname))
  throw new Error("Use a local demo server.");
if (!process.env.OPENROUTER_API_KEY || !process.env.ATTEMPT_SIGNING_SECRET) {
  console.error("Configure local credentials first.");
  process.exit(2);
}
async function send(body) {
  const start = Date.now();
  const r = await fetch(new URL("/api/coach", base), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(75000),
  });
  const data = await r.json();
  console.log(
    JSON.stringify({
      http: r.status,
      phase: data.state?.phase,
      label: data.state?.diagnosis?.label,
      status: data.state?.result?.status,
      turns: data.state?.turns.length,
      latencyMs: Date.now() - start,
      requestId: r.headers.get("x-request-id"),
    }),
  );
  if (!r.ok) throw new Error(`Coaching failed: ${data.error?.code}`);
  return data;
}
const initial = {
  courseId: "classical-genetics",
  questionId: "genotype-phenotype-1",
  localSessionId: crypto.randomUUID(),
  answer: "PP or Pp",
  explanation: "I guessed.",
};
const next = (data, answer, explanation) => ({
  answer,
  explanation,
  continuation: { state: data.state, token: data.continuationToken },
});
let data = await send(initial);
if (data.state.phase !== "clarify")
  throw new Error(
    "Insufficient evidence did not trigger a diagnostic question.",
  );
const corrected =
  "I now understand that one P produces purple with complete dominance. Pp can be purple and still contains p. So both PP and Pp fit the original purple plant; appearance cannot tell them apart.";
data = await send(
  next(data, "Yes, Pp can be purple; both PP and Pp are possible.", corrected),
);
if (data.state.phase === "clarify")
  data = await send(
    next(data, "The p allele is still present in Pp.", corrected),
  );
if (data.state.phase !== "verify" || data.state.diagnosis.reviewRequired)
  throw new Error(
    "Sound clarification did not resolve the hypothesis; inspect this integration case.",
  );
data = await send(
  next(
    data,
    "RR or Rr; r can remain present.",
    "A single R masks the recessive phenotype under complete dominance. RR and Rr are both red, so the red appearance does not exclude r.",
  ),
);
if (data.state.phase !== "complete" || data.state.result.status !== "verified")
  throw new Error("Sound follow-up was not verified.");
// A second conversation explicitly exercises the self-guided uncertainty path.
data = await send({ ...initial, localSessionId: crypto.randomUUID() });
for (let i = 0; i < 2; i++) {
  if (data.state.phase !== "clarify")
    throw new Error("Expected another diagnostic step.");
  data = await send(next(data, "Unsure", "I am not sure."));
}
if (data.state.phase !== "verify" || !data.lesson)
  throw new Error("Repeated uncertainty needs a sourced foundation lesson.");
data = await send(
  next(data, "RR only", "Red is dominant, so both alleles must be R."),
);
if (data.state.phase !== "retry" || !data.lesson)
  throw new Error("Unsupported verification should lead to guided retry.");
data = await send(
  next(
    data,
    "RR or Rr",
    "R masks r in Rr, but r is still present. Either RR or Rr gives red flowers, so red does not distinguish them.",
  ),
);
if (data.state.result?.status !== "verified")
  throw new Error("Guided retry did not verify the corrected explanation.");
console.log(
  JSON.stringify({
    passed: true,
    disclosure: "Live synthetic integration, not educational validation.",
  }),
);
