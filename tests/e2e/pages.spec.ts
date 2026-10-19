import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, resetBackend } from "./helpers";

test.beforeEach(async ({ page }) => resetBackend(page));

test("usage page renders charts, totals and range switch", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("requests-chart")).toBeVisible();
  await expect(page.getByTestId("cost-chart").locator("rect")).toHaveCount(30);
  const total30 = await page.getByTestId("total-requests").textContent();
  await page.getByLabel("Range").selectOption("7");
  await expect(page.getByTestId("cost-chart").locator("rect")).toHaveCount(7);
  await expect(page.getByTestId("total-requests")).not.toHaveText(total30!);
  await expectNoA11yViolations(page);
});

test("experiment page shows conversion rates and a significance verdict", async ({ page }) => {
  await page.goto("/experiments");
  await expect(page.getByTestId("variant-table")).toContainText("Control");
  await expect(page.getByTestId("significance")).toContainText(/z = -?\d/);
  await expectNoA11yViolations(page);
});

for (const uid of ["e2e-user-0001", "e2e-user-0002", "e2e-user-0003", "e2e-user-0004"]) {
  test(`onboarding flow converts and is logged (${uid})`, async ({ page }) => {
    const before = await (await page.request.get("/api/experiments/onboarding")).json();
    await page.goto(`/onboarding?uid=${uid}`);
    const section = page.getByTestId("onboarding");
    await expect(section).toBeVisible();
    const variant = await section.getAttribute("data-variant");
    // Deterministic: the same uid always gets the same variant.
    const again = await (await page.request.post("/api/experiments/onboarding/assign", { data: { userId: uid } })).json();
    expect(again.variant).toBe(variant);
    await expectNoA11yViolations(page);

    if (variant === "A") await page.getByRole("button", { name: "Mark done" }).click();
    await page.getByRole("button", { name: "Create my first key" }).click();
    await expect(page.getByTestId("onboarding-done")).toContainText("dk_demo_");

    const after = await (await page.request.get("/api/experiments/onboarding")).json();
    const pick = (a: { analysis: { variants: { variant: string; exposed: number; converted: number }[] } }) =>
      a.analysis.variants.find((v) => v.variant === variant)!;
    expect(pick(after).exposed).toBe(pick(before).exposed + 1);
    expect(pick(after).converted).toBe(pick(before).converted + 1);
  });
}
