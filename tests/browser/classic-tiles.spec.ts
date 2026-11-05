import { expect, test } from "@playwright/test";

test("CLASSIC-004: passos opt-in avançam uma célula e param quando o controle é solto", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/jogar/?modo=classico&passos=1");
  await expect(page.locator("canvas#game")).toBeVisible();
  await expect(page.locator("#classicTileHint")).toContainText("PASSOS 32×32");
  await expect(page.locator("#coords")).toContainText("X 0 · Y 0");
  // Do not wait for the HUD to report X 1 while the key remains pressed:
  // on a busy runner that can queue a second step before keyup arrives.
  await page.keyboard.down("d");
  await page.waitForTimeout(100);
  await page.keyboard.up("d");
  await expect(page.locator("#coords")).toContainText("X 1 · Y 0", { timeout: 8000 });
  // A committed step is allowed to finish, but no second step is queued.
  await page.waitForTimeout(550);
  await expect(page.locator("#coords")).toContainText("X 1 · Y 0");
  await page.waitForTimeout(250);
  await expect(page.locator("#coords")).toContainText("X 1 · Y 0");
  await expect(page.locator("#battleToggle")).toBeVisible();
  expect(errors).toEqual([]);
});

test("o experimento não invade solo normal, clássico contínuo nem multiplayer", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/jogar/?modo=classico");
  await expect(page.locator("canvas#game")).toBeVisible();
  await expect(page.locator("#classicTileHint")).toHaveCount(0);
  await page.goto("/jogar/?modo=solo&passos=1");
  await expect(page.locator("canvas#game")).toBeVisible();
  await expect(page.locator("#classicTileHint")).toHaveCount(0);
  await page.goto("/jogar/?room=tile-isolation&passos=1");
  await expect(page.locator("#multiplayerStatus")).toContainText("Online");
  await expect(page.locator("#classicTileHint")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("CLASSIC-004 usa controles responsivos também em paisagem", async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 390 });
  await page.goto("/jogar/?modo=classico&passos=1");
  await expect(page.locator("#classicTileHint")).toBeVisible();
  await expect(page.locator("#joystick")).toBeVisible();
  await expect(page.locator("#attack")).toBeVisible();
  await expect(page.locator("#battleToggle")).toBeVisible();
  await page.locator("#battleToggle").click();
  await expect(page.locator("#battlePanel")).toBeVisible();
  await page.locator("#battleToggle").click();
  await expect(page.locator("#battlePanel")).toBeHidden();
});
