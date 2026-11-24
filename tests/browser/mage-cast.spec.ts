import { expect, test } from "@playwright/test";
import { browserEncounter, SEED } from "../helpers/browserEncounter.ts";

/**
 * A magia do Mago no jogo de verdade (ADR 0070): com um mundo de Mago salvo, escolher um monstro faz o herói conjurar; o projétil e o
 * estouro aparecem na tela (violeta da gema do cajado), a mana é gasta e o monstro cai. Sem erros na página.
 */
const KEY = "terrania-origins-v1";

test("o Mago conjura contra um monstro de verdade: a magia aparece na tela, gasta mana e derrota o alvo (desktop/Android)", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const encounter = browserEncounter(true);
  await page.addInitScript(({ hero, seed, key }) => {
    localStorage.setItem(key, JSON.stringify({ mapVersion: 2, seed, x: hero.x, y: hero.y, hp: 80, kills: 0, defeated: [], experience: 0, heroClass: "mage", mana: 50 }));
    localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: true, cameraMotion: false }));
  }, { hero: encounter.hero, seed: SEED, key: KEY });
  await page.setViewportSize({ width: info.project.name === "android" ? 390 : 1200, height: 844 });
  await page.goto("/jogar/?modo=classico");
  await expect(page.locator("canvas#game")).toBeVisible();
  const toggle = page.locator("#battleToggle");
  if (await toggle.getAttribute("aria-expanded") !== "true") await toggle.click();
  const row = page.locator(`.battle-entry[data-creature-id="${encounter.mob.id}"]`);
  await expect(row).toBeVisible();
  // Conta os pixels violeta (gema, projétil e estouro) a cada quadro; antes de escolher o alvo é só a gema do cajado parado.
  await page.evaluate(() => {
    const w = window as unknown as { __violet: { max: number; base: number; armed: boolean } };
    w.__violet = { max: 0, base: 0, armed: false };
    const canvas = document.querySelector("canvas#game") as HTMLCanvasElement;
    const count = (): number => {
      // A região central (o herói fica no centro e o alvo a menos de 6 tiles), sem reduzir a imagem: o projétil é pequeno.
      const w = Math.min(canvas.width, Math.round(canvas.width * 0.8)), h = Math.min(canvas.height, Math.round(canvas.height * 0.5));
      const probe = document.createElement("canvas"); probe.width = w; probe.height = h;
      const ctx = probe.getContext("2d", { willReadFrequently: true })!; ctx.drawImage(canvas, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data; let n = 0;
      for (let i = 0; i < data.length; i += 4) { const r = data[i]!, g = data[i + 1]!, b = data[i + 2]!; if (b > 215 && r > 130 && r < 225 && g < r - 5 && b - g > 40) n++; }
      return n;
    };
    const loop = (): void => { const n = count(); if (w.__violet.armed) w.__violet.max = Math.max(w.__violet.max, n); else w.__violet.base = Math.max(w.__violet.base, n); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => { (window as unknown as { __violet: { armed: boolean } }).__violet.armed = true; });
  if (info.project.name === "android") await row.tap(); else await row.click();
  await expect(page.locator("#classicTarget")).toContainText(/Slime/);
  await expect.poll(() => page.evaluate(([key, id]) => {
    const saved = JSON.parse(localStorage.getItem(key!) ?? "null") as { defeated?: string[] } | null;
    return saved?.defeated?.includes(id!) === true;
  }, [KEY, encounter.mob.id]), { timeout: 15000 }).toBe(true);
  await page.waitForTimeout(500);
  const seen = await page.evaluate(() => (window as unknown as { __violet: { max: number; base: number } }).__violet);
  expect(seen.max, `pixels violeta durante a magia (${seen.max}) contra o cajado parado (${seen.base})`).toBeGreaterThan(seen.base + 40);
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? "null") as { heroClass?: string; mana?: number }, KEY);
  expect(saved.heroClass).toBe("mage");
  expect(saved.mana!, "a magia gastou mana").toBeLessThan(50);
  await page.locator("canvas#game").screenshot({ path: test.info().outputPath("mago-conjurando.png") });
  expect(errors).toEqual([]);
});
