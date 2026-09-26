import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  supportedDiagnosis,
  uncertainty,
  verified,
} from "../fixtures/learner-contracts";

test("explained answer → feedback → check → persistent educator result and reset", async ({
  page,
  context,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/analyze", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.answer).toBe("PP only");
    expect(body.localSessionId).toBeTruthy();
    await route.fulfill({ json: supportedDiagnosis });
  });
  await page.route("**/api/verify", async (route) => {
    expect(route.request().postDataJSON().nextQuestionId).toBe(
      "genotype-phenotype-2",
    );
    await route.fulfill({ json: verified });
  });
  await page.goto("/learn?concept=genotype-phenotype");
  await page.getByLabel("Your answer", { exact: true }).fill("PP only");
  await page
    .getByLabel("Explain your reasoning", { exact: true })
    .fill("Purple is dominant, so both alleles must be P.");
  await page.getByRole("button", { name: "Get feedback", exact: true }).click();
  await expect(
    page.getByText("Dominant means homozygous", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Check understanding", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Check understanding", exact: true }),
  ).toBeVisible();
  const educator = await context.newPage();
  await educator.goto("/educator");
  await expect(
    educator.getByText("1 awaiting a check", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Your answer", { exact: true }).fill("RR or Rr");
  await page
    .getByLabel("Explain your reasoning", { exact: true })
    .fill("R masks r in a heterozygote, so either genotype can be red.");
  await page
    .getByRole("button", { name: "Check understanding", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "That reasoning holds up." }),
  ).toBeVisible();
  await expect(
    educator.getByText("0 awaiting a check", { exact: false }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: `test-results/${info.project.name}-feedback.png`,
    fullPage: true,
  });
  await educator.reload();
  await expect(
    educator.getByRole("heading", { name: "Attempt history" }),
  ).toBeVisible();
  await educator
    .getByRole("button", { name: "Reset session", exact: true })
    .click();
  await educator
    .getByRole("button", { name: "Clear saved session", exact: true })
    .click();
  await expect(
    educator.getByRole("heading", { name: "Start with one explanation." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Get feedback", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("review, provider failure, retry and invalid output keep honest states", async ({
  page,
}) => {
  let n = 0;
  await page.route("**/api/analyze", async (route) => {
    n++;
    if (n === 1) await route.fulfill({ json: uncertainty });
    else if (n === 2)
      await route.fulfill({
        status: 502,
        json: { error: { code: "PROVIDER_FAILURE" } },
      });
    else if (n === 3)
      await route.fulfill({
        json: {
          ...supportedDiagnosis,
          nextQuestion: { id: "invented", prompt: "Invalid" },
        },
      });
    else await route.fulfill({ json: supportedDiagnosis });
  });
  await page.goto("/learn?concept=genotype-phenotype");
  await page.getByLabel("Your answer", { exact: true }).fill("PP or Pp");
  await page
    .getByLabel("Explain your reasoning", { exact: true })
    .fill("I guessed.");
  await page.getByRole("button", { name: "Get feedback", exact: true }).click();
  await expect(page.getByText("Let’s clarify before moving on.")).toBeVisible();
  await expect(
    page.getByText("Generative fallback", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Check understanding", exact: true }),
  ).toHaveCount(0);
  for (const message of ["service is unavailable", "could not be validated"]) {
    await page
      .getByRole("button", { name: "Get feedback", exact: true })
      .click();
    await expect(page.locator("[data-slot=alert]")).toContainText(message);
    await expect(
      page.getByLabel("Explain your reasoning", { exact: true }),
    ).toHaveValue("I guessed.");
  }
  await page.getByRole("button", { name: "Get feedback", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Check understanding", exact: true }),
  ).toBeVisible();
});

test("all screens are accessible, responsive and free of runtime errors", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of [
    "/",
    "/learn",
    "/learn?concept=segregation",
    "/educator",
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
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.route("**/api/analyze", (route) => route.fulfill({ json: uncertainty }));
  await page.goto("/learn?concept=genotype-phenotype");
  await page.getByLabel("Your answer", { exact: true }).focus();
  await page.keyboard.type("PP or Pp");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Explain your reasoning", { exact: true })).toBeFocused();
  await page.keyboard.type("I guessed.");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Get feedback", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Let’s clarify before moving on.")).toBeVisible();
  expect(errors).toEqual([]);
});

for (const status of ["needsPractice", "educatorReview"] as const) {
  test(`verification ${status} is presented honestly and persists`, async ({
    page,
  }) => {
    await page.route("**/api/analyze", (route) =>
      route.fulfill({ json: supportedDiagnosis }),
    );
    await page.route("**/api/verify", (route) =>
      route.fulfill({
        json: {
          status,
          reason: "Discuss the difference between phenotype and genotype.",
        },
      }),
    );
    await page.goto("/learn?concept=genotype-phenotype");
    await page.getByLabel("Your answer", { exact: true }).fill("PP");
    await page
      .getByLabel("Explain your reasoning", { exact: true })
      .fill("Both alleles must be P.");
    await page
      .getByRole("button", { name: "Get feedback", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Check understanding", exact: true })
      .waitFor();
    await page.getByLabel("Your answer", { exact: true }).fill("RR");
    await page
      .getByLabel("Explain your reasoning", { exact: true })
      .fill("I am unsure how r affects the phenotype.");
    await page
      .getByRole("button", { name: "Check understanding", exact: true })
      .click();
    const heading =
      status === "needsPractice"
        ? "One more step toward clarity."
        : "Bring this to your educator.";
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "That reasoning holds up." }),
    ).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  });
}

test("blocked storage supports an in-memory session with a visible disclosure", async ({
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
  await page.route("**/api/analyze", (route) =>
    route.fulfill({ json: supportedDiagnosis }),
  );
  await page.goto("/learn?concept=genotype-phenotype");
  await page.getByLabel("Your answer", { exact: true }).fill("PP");
  await page
    .getByLabel("Explain your reasoning", { exact: true })
    .fill("Both alleles must be P.");
  await page.getByRole("button", { name: "Get feedback", exact: true }).click();
  await expect(
    page.getByText("Browser storage is unavailable", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Check understanding", exact: true }),
  ).toBeVisible();
});
