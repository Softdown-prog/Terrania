import { expect, test } from "@playwright/test";
import { browserEncounter, SEED } from "../helpers/browserEncounter.ts";

/**
 * O tiro do Arqueiro no jogo de verdade (ADR 0119): com um mundo de Arqueiro salvo, escolher um monstro faz o herói atirar; cada tiro gasta
 * uma flecha da aljava (que o save guarda), o monstro cai e a vida do herói é a de 85%. Sem erros na página.
 */
const KEY = "terrania-origins-v1";
type Saved = { heroClass?: string; defeated?: string[]; inventory?: { quiver?: { counts: Record<string, number>; equipped: string } } };

test("o Arqueiro atira num monstro de verdade: gasta flechas da aljava e derrota o alvo (desktop/Android)", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const encounter = browserEncounter(true);
  await page.addInitScript(({ hero, seed, key }) => {
    localStorage.setItem(key, JSON.stringify({ mapVersion: 2, seed, x: hero.x, y: hero.y, hp: 85, kills: 0, defeated: [], experience: 0, heroClass: "archer" }));
    localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: true, cameraMotion: false }));
  }, { hero: encounter.hero, seed: SEED, key: KEY });
  await page.setViewportSize({ width: info.project.name === "android" ? 390 : 1200, height: 844 });
  await page.goto("/jogar/?modo=classico");
  await expect(page.locator("canvas#game")).toBeVisible();
  await expect(page.locator("#hpText")).toHaveText("85 / 85");
  await expect(page.locator("#manaText")).toHaveCount(0);
  const toggle = page.locator("#battleToggle");
  if (await toggle.getAttribute("aria-expanded") !== "true") await toggle.click();
  const row = page.locator(`.battle-entry[data-creature-id="${encounter.mob.id}"]`);
  await expect(row).toBeVisible();
  if (info.project.name === "android") await row.tap(); else await row.click();
  await expect(page.locator("#classicTarget")).toContainText(/Slime/);
  const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? "null") as Saved, KEY);
  await expect.poll(async () => (await read())?.defeated?.includes(encounter.mob.id) === true, { timeout: 20000 }).toBe(true);
  await page.waitForTimeout(500);
  const saved = (await read())!;
  expect(saved.heroClass).toBe("archer");
  const left = saved.inventory?.quiver?.counts.reed ?? 30;
  expect(left, "cada tiro gastou uma flecha de junco").toBeLessThan(30);
  expect(left, "e a aljava não sumiu").toBeGreaterThan(0);
  await page.locator("canvas#game").screenshot({ path: test.info().outputPath("arqueiro-atirando-no-jogo.png") });
  expect(errors).toEqual([]);
});
