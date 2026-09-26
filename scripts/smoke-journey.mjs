/** Explicit live browser smoke. Uses invented answers and real providers; incurs API usage. */
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
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.goto(new URL("/learn?concept=genotype-phenotype", base).href);
  await page.getByLabel("Your answer", { exact: true }).fill("PP only");
  await page
    .getByLabel("Explain your reasoning", { exact: true })
    .fill(
      "The flower is purple and purple is dominant. I think that means it inherited P from each parent, so it must be PP.",
    );
  let started = Date.now();
  const analysisPending = page.waitForResponse((r) =>
    r.url().endsWith("/api/analyze"),
  );
  await page.getByRole("button", { name: "Get feedback", exact: true }).click();
  const response = await analysisPending;
  if (!response.ok())
    throw new Error(
      `Analyze HTTP ${response.status()}; request ${response.headers()["x-request-id"]}`,
    );
  const analysis = await response.json();
  console.log(
    JSON.stringify({
      stage: "analyze",
      label: analysis.diagnosis.label,
      provider: analysis.diagnosis.decisionProvider,
      review: analysis.diagnosis.reviewRequired,
      latencyMs: Date.now() - started,
      requestId: response.headers()["x-request-id"],
    }),
  );
  if (analysis.diagnosis.reviewRequired)
    throw new Error(
      "Live diagnosis requested review; verification acceptance remains pending.",
    );
  await page
    .getByLabel("Your answer", { exact: true })
    .fill("RR or Rr. A red flower can carry r.");
  await page
    .getByLabel("Explain your reasoning", { exact: true })
    .fill(
      "R is completely dominant, so a single R gives red flowers in Rr. RR also gives red flowers. Seeing red cannot distinguish those genotypes and does not rule out the recessive allele.",
    );
  started = Date.now();
  const verificationPending = page.waitForResponse((r) =>
    r.url().endsWith("/api/verify"),
  );
  await page
    .getByRole("button", { name: "Check understanding", exact: true })
    .click();
  const result = await verificationPending;
  if (!result.ok())
    throw new Error(
      `Verify HTTP ${result.status()}; request ${result.headers()["x-request-id"]}`,
    );
  const verification = await result.json();
  console.log(
    JSON.stringify({
      stage: "verify",
      status: verification.status,
      latencyMs: Date.now() - started,
      requestId: result.headers()["x-request-id"],
    }),
  );
  if (verification.status !== "verified")
    throw new Error("The sound synthetic verification needs manual review.");
  await page
    .getByRole("heading", { name: "That reasoning holds up." })
    .waitFor();
  await mkdir("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/live-learner.png",
    fullPage: true,
  });
  await page.goto(new URL("/educator", base).href);
  await page.getByRole("heading", { name: "Attempt history" }).waitFor();
  if (
    (await page.getByText("Understanding checked", { exact: true }).count()) < 2
  )
    throw new Error("Live result absent from educator view.");
  await page.reload();
  await page.getByRole("heading", { name: "Attempt history" }).waitFor();
  await page.screenshot({
    path: "test-results/live-educator.png",
    fullPage: true,
  });
  if (errors.length)
    throw new Error(`Browser runtime errors: ${errors.length}`);
  console.log(
    JSON.stringify({
      passed: true,
      disclosure:
        "Live synthetic integration only; not educational validation.",
    }),
  );
} finally {
  await browser.close();
}
