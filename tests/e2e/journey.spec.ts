import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type {
  CoachRequest,
  CoachResponse,
  CoachPhase,
  CoachResult,
  CoachState,
} from "../../lib/contracts";
import { supportedDiagnosis } from "../fixtures/learner-contracts";
import knowledge from "../../data/genetics-knowledge.json" with { type: "json" };

type Step = {
  phase: CoachPhase;
  status?: CoachResult["status"];
  error?: boolean;
  invalid?: boolean;
  uncertain?: boolean;
};
async function mockCoach(page: Page, steps: Step[]) {
  let index = 0;
  await page.route("**/api/coach", async (route) => {
    const step = steps[Math.min(index++, steps.length - 1)];
    if (step.error) {
      await route.fulfill({
        status: 502,
        json: { error: { code: "PROVIDER_FAILURE" } },
      });
      return;
    }
    const body = route.request().postDataJSON() as CoachRequest;
    const prior = "continuation" in body ? body.continuation.state : null;
    const state: CoachState = prior
      ? structuredClone(prior)
      : {
          version: 1,
          id: `browser-test-conversation-${index}`,
          courseId: "classical-genetics",
          courseVersion: "1.0.0",
          knowledgeVersion: "1.0.0",
          questionId: "genotype-phenotype-1",
          localSessionId: "localSessionId" in body ? body.localSessionId : "",
          issuedAt: Math.floor(Date.now() / 1000),
          phase: "clarify",
          turns: [],
          pending: null,
          diagnosis: null,
          feedback: null,
          result: null,
        };
    state.turns.push({
      kind: !prior
        ? "initial"
        : prior.phase === "clarify"
          ? "probe"
          : "verification",
      questionId: prior?.pending?.id ?? state.questionId,
      prompt:
        prior?.pending?.prompt ?? "Which purple-flower genotypes are possible?",
      answer: body.answer,
      explanation: body.explanation,
    });
    state.phase = step.phase;
    state.diagnosis =
      step.phase === "clarify" || step.uncertain
        ? {
            label: "insufficient-evidence",
            evidence: body.explanation,
            reviewRequired: true,
            decisionProvider: "jev",
          }
        : supportedDiagnosis.diagnosis;
    state.feedback = state.diagnosis.reviewRequired
      ? null
      : supportedDiagnosis.feedback;
    state.pending =
      step.phase === "complete"
        ? null
        : step.phase === "clarify"
          ? {
              id: `genotype-phenotype-1-probe-${state.turns.length}`,
              prompt:
                "Could Pp be purple? Explain what each allele contributes.",
            }
          : supportedDiagnosis.nextQuestion;
    state.result = step.status
      ? {
          status: step.status,
          reason:
            step.status === "verified"
              ? "Your explanation supports complete dominance."
              : "The reasoning needs another step.",
        }
      : null;
    const response: CoachResponse = {
      state,
      continuationToken:
        step.phase === "complete" ? null : "TEST_ONLY_NOT_A_TOKEN",
      message:
        step.phase === "clarify"
          ? "Let’s focus on one distinction."
          : step.phase === "complete"
            ? "Your next step is ready."
            : "Use the knowledge base and try this question.",
      lesson:
        step.phase === "retry" || step.uncertain
          ? knowledge.concepts[0].lesson
          : null,
    };
    if (step.invalid)
      state.pending = { id: "invented", prompt: "An invalid question" };
    await route.fulfill({ json: response });
  });
}
async function answer(
  page: Page,
  button: string,
  explanation = "Pp can be purple because one P masks the recessive phenotype.",
) {
  await page.getByLabel("Your answer", { exact: true }).fill("PP or Pp");
  await page
    .getByLabel("Explain your reasoning", { exact: true })
    .fill(explanation);
  await page.getByRole("button", { name: button, exact: true }).click();
}

test("clarification updates the conversation, resumes, verifies and syncs personal progress", async ({
  page,
  context,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await mockCoach(page, [
    { phase: "clarify" },
    { phase: "verify" },
    { phase: "complete", status: "verified" },
  ]);
  await page.goto("/learn?concept=genotype-phenotype");
  await answer(page, "Get feedback", "I guessed.");
  await expect(
    page.getByRole("heading", { name: "Let’s narrow it down." }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Continue coaching", exact: true }),
  ).toBeVisible();
  const progress = await context.newPage();
  await progress.goto("/progress");
  await expect(
    progress.getByText("Exploring your reasoning", { exact: true }),
  ).toBeVisible();
  await answer(page, "Continue coaching");
  await expect(
    page.getByRole("heading", { name: "Check what clicked." }),
  ).toBeVisible();
  await answer(
    page,
    "Check understanding",
    "Rr and RR both produce red because R masks r.",
  );
  await expect(
    page.getByRole("heading", { name: "That reasoning holds up." }),
  ).toBeVisible();
  await expect(
    progress.getByText("Understanding checked", { exact: true }),
  ).toHaveCount(2);
  await progress.reload();
  await expect(
    progress.getByRole("heading", { name: "Your learning history" }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: `test-results/${info.project.name}-coaching.png`,
    fullPage: true,
  });
  await progress
    .getByRole("button", { name: "Reset session", exact: true })
    .click();
  await progress
    .getByRole("button", { name: "Clear saved session", exact: true })
    .click();
  await expect(
    progress.getByRole("heading", { name: "Start with one explanation." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Get feedback", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("persistent uncertainty becomes a lesson, retry and study plan without human handoff", async ({
  page,
}) => {
  await mockCoach(page, [
    { phase: "clarify" },
    { phase: "clarify" },
    { phase: "verify", uncertain: true },
    { phase: "retry", status: "needsClarification", uncertain: true },
    { phase: "complete", status: "needsPractice", uncertain: true },
  ]);
  await page.goto("/learn?concept=genotype-phenotype");
  await answer(page, "Get feedback", "I guessed.");
  await answer(page, "Continue coaching", "I am unsure.");
  await answer(page, "Continue coaching", "I still do not know.");
  await expect(
    page.getByRole("heading", { name: "Worked example" }),
  ).toBeVisible();
  await answer(page, "Check understanding", "I guessed.");
  await expect(
    page.getByRole("heading", { name: "Try the steps in your own words." }),
  ).toBeVisible();
  await answer(page, "Check understanding", "I am not sure.");
  await expect(
    page.getByRole("heading", { name: "Keep building the foundation." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your next steps" }),
  ).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/teacher|educator/i);
  await expect(
    page.getByRole("button", { name: "Check understanding", exact: true }),
  ).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("provider and invalid output errors preserve text for manual retry", async ({
  page,
}) => {
  await mockCoach(page, [
    { phase: "verify", error: true },
    { phase: "verify", invalid: true },
    { phase: "verify" },
  ]);
  await page.goto("/learn?concept=genotype-phenotype");
  await answer(page, "Get feedback");
  await expect(page.locator("[data-slot=alert]")).toContainText(
    "service is unavailable",
  );
  await expect(page.getByLabel("Your answer", { exact: true })).toHaveValue(
    "PP or Pp",
  );
  await page.getByRole("button", { name: "Get feedback", exact: true }).click();
  await expect(page.locator("[data-slot=alert]")).toContainText(
    "could not be validated",
  );
  await page.getByRole("button", { name: "Get feedback", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Check understanding", exact: true }),
  ).toBeVisible();
});

test("screens are responsive and accessible; keyboard submission and old bookmarks work", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of [
    "/",
    "/learn",
    "/learn?concept=segregation",
    "/progress",
    "/demo",
  ]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({
      path: `test-results/${info.project.name}-${path === "/" ? "home" : path.includes("?") ? "question" : path.slice(1)}.png`,
      fullPage: true,
    });
  }
  await page.goto("/educator");
  await expect(page).toHaveURL(/\/progress$/);
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await mockCoach(page, [{ phase: "clarify" }]);
  await page.goto("/learn?concept=genotype-phenotype");
  await page.getByLabel("Your answer", { exact: true }).focus();
  await page.keyboard.type("PP");
  await page.keyboard.press("Tab");
  await expect(
    page.getByLabel("Explain your reasoning", { exact: true }),
  ).toBeFocused();
  await page.keyboard.type("I guessed.");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Continue coaching", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("blocked browser storage still supports an in-memory coaching session", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
    Storage.prototype.setItem = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
  });
  await mockCoach(page, [{ phase: "clarify" }]);
  await page.goto("/learn?concept=genotype-phenotype");
  await answer(page, "Get feedback", "I guessed.");
  await expect(
    page.getByText("Browser storage is unavailable", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue coaching", exact: true }),
  ).toBeVisible();
});

test("an earlier saved conversation opens its own result, not the latest attempt", async ({
  page,
}) => {
  await mockCoach(page, [
    { phase: "verify" },
    { phase: "complete", status: "verified" },
    { phase: "clarify" },
  ]);
  await page.goto("/learn?concept=genotype-phenotype");
  await answer(page, "Get feedback");
  await answer(page, "Check understanding");
  await expect(
    page.getByRole("heading", { name: "That reasoning holds up." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Practise again", exact: true })
    .click();
  await answer(page, "Get feedback", "I guessed.");
  await expect(
    page.getByRole("heading", { name: "Let’s narrow it down." }),
  ).toBeVisible();
  await page.goto("/progress");
  await page
    .getByRole("link", { name: "Revisit this concept", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "That reasoning holds up." }),
  ).toBeVisible();
});
