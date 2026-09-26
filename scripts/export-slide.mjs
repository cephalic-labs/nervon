import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const base = new URL(
  process.env.NERVON_SMOKE_BASE_URL ?? "http://localhost:3000",
);
if (!["localhost", "127.0.0.1", "[::1]"].includes(base.hostname))
  throw new Error("Use a local server.");
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  await page.goto(new URL("/demo", base).href);
  await page.evaluate(() => document.fonts.ready);
  await mkdir("docs/demo", { recursive: true });
  await page.pdf({
    path: "docs/demo/nervon-day-1.pdf",
    printBackground: true,
    preferCSSPageSize: true,
  });
  console.log("Exported docs/demo/nervon-day-1.pdf");
} finally {
  await browser.close();
}
