/** Explicit live browser smoke: invented responses, real models, no route interception. */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const base = new URL(
  process.env.NERVON_SMOKE_BASE_URL ?? "http://localhost:3000",
);
if (!["localhost", "127.0.0.1", "[::1]"].includes(base.hostname))
  throw new Error("Use a local demo server.");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(75000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
async function respond(button, answer, explanation) {
  await page.getByLabel("Your answer", { exact: true }).fill(answer);
  await page
    .getByLabel("Explain your reasoning", { exact: true })
    .fill(explanation);
  const started = Date.now();
  const pending = page.waitForResponse((r) => r.url().endsWith("/api/coach"));
  await page.getByRole("button", { name: button, exact: true }).click();
  const response = await pending;
  if (!response.ok())
    throw new Error(
      `Coach HTTP ${response.status()}; request ${response.headers()["x-request-id"]}`,
    );
  const data = await response.json();
  console.log(
    JSON.stringify({
      phase: data.state.phase,
      label: data.state.diagnosis?.label,
      status: data.state.result?.status,
      latencyMs: Date.now() - started,
      requestId: response.headers()["x-request-id"],
    }),
  );
  return data;
}
try {
  await page.goto(new URL("/learn?concept=genotype-phenotype", base).href);
  let result = await respond("Get feedback", "PP or Pp", "I guessed.");
  if (result.state.phase !== "clarify")
    throw new Error("Expected a targeted diagnostic question.");
  await mkdir("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/live-clarification.png",
    fullPage: true,
  });
  const explanation =
    "I now understand that one P makes the flower purple under complete dominance. Pp can be purple and still contains p. Both PP and Pp fit the original flower; appearance alone cannot distinguish them.";
  for (let i = 0; i < 2 && result.state.phase === "clarify"; i++)
    result = await respond(
      "Continue coaching",
      "Pp can be purple and p remains present.",
      explanation,
    );
  if (result.state.phase !== "verify" || result.state.diagnosis.reviewRequired)
    throw new Error(
      "The corrected explanation did not resolve the hypothesis.",
    );
  result = await respond(
    "Check understanding",
    "RR or Rr; r may be present.",
    "One R masks the recessive phenotype without removing r. Both RR and Rr produce red flowers, so red cannot distinguish these genotypes.",
  );
  if (result.state.result?.status !== "verified")
    throw new Error("The sound follow-up was not verified.");
  await page
    .getByRole("heading", { name: "That reasoning holds up." })
    .waitFor();
  await page.screenshot({
    path: "test-results/live-learner.png",
    fullPage: true,
  });
  await page.goto(new URL("/progress", base).href);
  await page.getByRole("heading", { name: "Your learning history" }).waitFor();
  await page.reload();
  await page.getByRole("heading", { name: "Your learning history" }).waitFor();
  if (
    (await page.getByText("Understanding checked", { exact: true }).count()) < 2
  )
    throw new Error("Check result missing from progress.");
  await page.screenshot({
    path: "test-results/live-progress.png",
    fullPage: true,
  });
  if (errors.length)
    throw new Error(`Browser runtime errors: ${errors.length}`);
  console.log(
    JSON.stringify({
      passed: true,
      disclosure: "Live synthetic coaching, not educational validation.",
    }),
  );
} finally {
  await browser.close();
}
