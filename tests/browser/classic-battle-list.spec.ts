import { expect, test } from "@playwright/test";
import { browserEncounter, SEED } from "../helpers/browserEncounter.ts";
test("Battle List acompanha a câmera, seleciona alvo real e inicia perseguição", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  const encounter = browserEncounter();
  await page.addInitScript(({ hero, seed }) => {
    localStorage.setItem("terrania-origins-v1", JSON.stringify({
      seed, x: hero.x, y: hero.y, hp: 100, kills: 0, defeated: [],
    }));
  }, { hero: encounter.hero, seed: SEED });
  await page.setViewportSize({ width: info.project.name === "android" ? 390 : 1200, height: 800 });
  await page.goto("/jogar/?modo=classico");
  await expect(page.locator("canvas#game")).toBeVisible();
  const toggle = page.locator("#battleToggle");
  const panel = page.locator("#battlePanel");
  await expect(toggle).toBeVisible();
  if (info.project.name === "android") {
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(panel).toBeHidden();
    await toggle.tap();
  } else {
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
  }
  await expect(panel).toBeVisible();
  const row = page.locator('.battle-entry[data-creature-id="' + encounter.mob.id + '"]');
  await expect(row).toBeVisible();
  await expect(row).toHaveAttribute("aria-label", "Selecionar Slime, vida 2 de 2");
  await expect(page.locator("#battleCount")).not.toHaveText("0");
  await expect(page.locator(".battle-entry[data-creature-id]")).toHaveCount(
    await page.locator(".battle-entry").count(),
  );
  const initialCoords = await page.locator("#coords").textContent();
  if (info.project.name === "android") await row.tap();
  else await row.click();
  await expect(page.locator("#classicTarget")).toContainText("Slime");
  await expect(page.locator(".battle-entry[aria-pressed=true]")).toHaveCount(1);
  await expect.poll(() => page.locator("#coords").textContent(), { timeout: 8000 })
    .not.toBe(initialCoords);
  await expect.poll(() => page.evaluate(id => {
    const saved=JSON.parse(localStorage.getItem("terrania-origins-v1") ?? "null");
    return saved?.defeated?.includes(id) === true;
  }, encounter.mob.id), {timeout:15000}).toBe(true);
  await expect(row).toHaveCount(0); // 8 damage now defeats a 2-HP slime in one swing.
  await toggle.click();
  await expect(panel).toBeHidden();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(errors).toEqual([]);
});

test("Battle List do solo normal não cobre controles no Android", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("#battleToggle")).toBeVisible();
  await page.locator("#battleToggle").click();
  await expect(page.locator("#battlePanel")).toBeVisible();
  for (const id of ["#attack", "#joystick", "#gameMenuButton", ".quest"]) {
    const battle = await page.locator("#battlePanel").boundingBox();
    const button = await page.locator(id).boundingBox();
    expect(battle && button).toBeTruthy();
    const overlap = battle!.x < button!.x + button!.width &&
      battle!.x + battle!.width > button!.x &&
      battle!.y < button!.y + button!.height &&
      battle!.y + battle!.height > button!.y;
    expect(overlap, "Battle List must not overlap " + id).toBe(false);
  }
  // Keep a mobile-width landscape viewport in both Playwright projects,
  // otherwise the desktop project correctly hides touch-only controls.
  await page.setViewportSize({ width: 600, height: 390 });
  await expect(page.locator("#battlePanel")).toBeVisible();
  const battle = await page.locator("#battlePanel").boundingBox();
  const attack = await page.locator("#attack").boundingBox();
  expect(battle && attack).toBeTruthy();
  expect(battle!.y + battle!.height <= attack!.y ||
    battle!.x + battle!.width <= attack!.x ||
    attack!.x + attack!.width <= battle!.x).toBe(true);
  expect(errors).toEqual([]);
});
