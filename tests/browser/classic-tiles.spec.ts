import { expect, test } from "@playwright/test";

test("CLASSIC-004: passos opt-in avançam uma célula e param quando o controle é solto", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const start = new Date("2026-01-01T00:00:00Z");
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1000));
  await page.goto("/jogar/?modo=classico&passos=1");
  await expect.poll(async () => {
    await page.clock.runFor(32);
    return page.locator("canvas#game").count();
  }).toBe(1);
  await page.clock.runFor(64);
  await expect(page.locator("#classicTileHint")).toContainText("PASSOS 32×32");
  await expect(page.locator("#coords")).toContainText("X 0 · Y 0");
  // Release after crossing the tile edge and before the first step finishes.
  await page.keyboard.down("d");
  await page.clock.runFor(180);
  await page.keyboard.up("d");
  await expect(page.locator("#coords")).toContainText("X 1 · Y 0");
  await page.clock.runFor(800);
  await expect(page.locator("#coords")).toContainText("X 1 · Y 0");
  expect(await page.evaluate(() => {
    window.dispatchEvent(new Event("pagehide"));
    const save = JSON.parse(localStorage.getItem("terrania-origins-v1") ?? "null");
    return [save?.x, save?.y];
  })).toEqual([48, 16]);
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

for (const layout of ["normal", "landscape"] as const) {
  test(`CLASSIC-004: Battle List persegue e derrota um slime real (${layout})`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    // A naturally generated slime on seed 842136, with a verified clear approach.
    // Only seed the supported legacy save; no injected game/HUD state or fake hits.
    const mobId = "-2,-2,0";
    await page.addInitScript(() => {
      localStorage.setItem("terrania-origins-v1", JSON.stringify({
        seed: 842136, x: -660, y: -1008, hp: 100, kills: 0, defeated: [],
      }));
    });
    await page.setViewportSize(layout === "landscape" ? { width: 600, height: 390 } :
      { width: info.project.name === "android" ? 390 : 1200, height: 844 });
    await page.goto("/jogar/?modo=classico&passos=1");
    await expect(page.locator("canvas#game")).toBeVisible();
    await expect(page.locator("#classicTileHint")).toBeVisible();
    const toggle = page.locator("#battleToggle");
    const activate = async (locator: ReturnType<typeof page.locator>) => {
      if (info.project.name === "android") await locator.tap();
      else await locator.click();
    };
    if (await toggle.getAttribute("aria-expanded") !== "true") await activate(toggle);
    const row = page.locator(`.battle-entry[data-creature-id="${mobId}"]`);
    await expect(row).toBeVisible();
    const before = await page.locator("#coords").textContent();
    await activate(row);
    await expect(page.locator("#classicTarget")).toContainText("Slime");
    await expect.poll(() => page.locator("#coords").textContent()).not.toBe(before);
    await expect.poll(() => page.evaluate(id => {
      const save = JSON.parse(localStorage.getItem("terrania-origins-v1") ?? "null");
      return save?.defeated?.includes(id) === true && save.kills >= 1;
    }, mobId), { timeout: 15000 }).toBe(true);
    await expect(row).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
