import { expect, test } from "@playwright/test";

/**
 * Fumaça das pedras no jogo de verdade (ADR 0035): o deserto (pedras de arenito) e a mata do oeste (pedras de
 * musgo) abrem e desenham sem erro, no desktop e no Android. A prova do estilo por bioma e da variação dos
 * formatos está em `tests/rocks.test.ts`; aqui ficam o caminho real do navegador e as capturas.
 */
const SEED = 842136, TILE = 32;
const SPOTS = [["deserto", 20, 15640], ["ruina", -91, 15628], ["oeste", -140, 0]] as const;

for (const [name, tx, ty] of SPOTS) {
  test(`pedras ${name}: abre, desenha e não dá erro (desktop/Android)`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(({ seed, x, y }) => {
      localStorage.setItem("terrania-origins-v1", JSON.stringify({ seed, x, y, hp: 100, kills: 0, defeated: [], experience: 3000 }));
      localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false }));
    }, { seed: SEED, x: (tx + .5) * TILE, y: (ty + .5) * TILE });
    await page.goto("/jogar/?modo=solo");
    await expect(page.locator("canvas#game")).toBeVisible();
    await expect(page.locator("#coords")).toContainText(String(ty));
    await page.waitForTimeout(1200);
    await page.locator("canvas#game").screenshot({ path: test.info().outputPath(`${name}.png`) });
    expect(errors).toEqual([]);
  });
}
