import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, resetBackend } from "./helpers";

test.beforeEach(async ({ page }) => resetBackend(page));

test("create key: secret shown once, works against the mock API, then revoke", async ({ page }) => {
  await page.goto("/keys");
  await expect(page.getByTestId("keys-table")).toBeVisible();
  await page.getByLabel("Key name").fill("e2e-key");
  await page.getByRole("button", { name: "Create key" }).click();

  const secret = (await page.getByTestId("secret-value").textContent())!.trim();
  expect(secret).toMatch(/^dk_demo_[\w-]{32}$/);
  await expectNoA11yViolations(page);

  // The key authenticates against the mocked metered endpoint.
  const ok = await page.request.post("/api/v1/speech", {
    headers: { authorization: `Bearer ${secret}` },
    data: { text: "hello from playwright", model: "tts-turbo" },
  });
  expect(ok.status()).toBe(200);

  // Dismiss and reload: the full secret is never shown or returned again.
  await page.getByRole("button", { name: "I have saved it" }).click();
  await page.reload();
  await expect(page.getByTestId("keys-table")).toContainText("e2e-key");
  expect(await page.content()).not.toContain(secret);
  const list = await (await page.request.get("/api/keys")).text();
  expect(list).not.toContain(secret);

  const row = page.locator("tr", { hasText: "e2e-key" });
  await expect(row).not.toContainText("never"); // last-used was recorded
  await row.getByRole("button", { name: "Revoke e2e-key" }).click();
  await row.getByRole("button", { name: "Confirm revoke e2e-key" }).click();
  await expect(row.locator(".badge")).toHaveText("revoked");

  const denied = await page.request.post("/api/v1/speech", {
    headers: { authorization: `Bearer ${secret}` },
    data: { text: "x", model: "tts-turbo" },
  });
  expect(denied.status()).toBe(401);
});

test("rotate key issues a new secret and revokes the old one", async ({ page }) => {
  await page.goto("/keys");
  const row = page.locator("tr", { hasText: "staging" });
  await row.getByRole("button", { name: "Rotate staging" }).click();
  const secret = (await page.getByTestId("secret-value").textContent())!.trim();
  expect(secret).toMatch(/^dk_demo_/);
  const rows = page.locator("tbody tr", { hasText: "staging" });
  await expect(rows).toHaveCount(2);
  await expect(rows.locator(".badge", { hasText: "active" })).toHaveCount(1);
  await expect(rows.locator(".badge", { hasText: "revoked" })).toHaveCount(1);
});

test("invalid name shows an accessible error", async ({ page }) => {
  await page.goto("/keys");
  await page.getByLabel("Key name").fill("<bad>");
  await page.getByRole("button", { name: "Create key" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "name must be" })).toBeVisible();
  await expectNoA11yViolations(page);
});
