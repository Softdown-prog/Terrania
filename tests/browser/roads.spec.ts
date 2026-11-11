import { expect, test } from "@playwright/test";

/**
 * Fumaça das estradas no jogo de verdade (ADR 0034): a estrada vertical do deserto, a horizontal do leste e a do
 * norte (com capim) abrem, desenham e não dão erro, no desktop e no Android. A prova de que as marcas seguem
 * a direção da estrada está em `tests/roads.test.ts`; aqui ficam o caminho real do navegador e as capturas.
 */
const SEED = 842136, TILE = 32;
const SPOTS = [
  ["deserto-vertical", 2, 15640], ["leste-horizontal", 300, 0], ["norte-vertical", 1, 300],
] as const;

for (const [name, tx, ty] of SPOTS) {
  test(`estrada ${name}: abre com as marcas de roda, desenha e não dá erro (desktop/Android)`, async ({ page }) => {
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
