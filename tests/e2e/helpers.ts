import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export async function resetBackend(page: Page) {
  const r = await page.request.post("/api/dev/reset");
  expect(r.ok()).toBeTruthy();
}

/** Fail on any WCAG 2.x A/AA violation, with readable output. */
export async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) - ${v.help}`);
  expect(summary, summary.join("\n")).toEqual([]);
}
