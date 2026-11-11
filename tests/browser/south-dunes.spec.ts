import { expect, test } from "@playwright/test";

/**
 * Fumaça do relevo das dunas no jogo de verdade (ADR 0033): o deserto abre, desenha areia e não dá erro, no
 * desktop e no Android. A prova de que a camada de relevo é desenhada (opacidade e ordem) está em
 * `tests/south-dunes.test.ts`; aqui o objetivo é só garantir o caminho real do navegador e deixar a captura.
 */
const SEED = 842136, TILE = 32;

test("deserto: abre com o relevo das dunas, desenha areia e não dá erro (desktop/Android)", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(({ seed, x, y }) => {
    localStorage.setItem("terrania-origins-v1", JSON.stringify({ seed, x, y, hp: 100, kills: 0, defeated: [], experience: 3000 }));
    localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false }));
  }, { seed: SEED, x: 20.5 * TILE, y: 15640.5 * TILE });
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  await expect(page.locator("#coords")).toContainText("15640");
  await page.waitForTimeout(1200);
  const png = (await page.locator("canvas#game").screenshot({ path: test.info().outputPath("deserto.png") })).toString("base64");
  const sand = await page.evaluate(async data => {
    const image = new Image();
    image.src = "data:image/png;base64," + data;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let count = 0;
    for (let i = 0; i < pixels.length; i += 16) if (pixels[i]! > pixels[i + 1]! && pixels[i + 1]! > pixels[i + 2]! && pixels[i]! - pixels[i + 2]! > 45) count++;
    return count;
  }, png);
  expect(sand, "areia desenhada na tela").toBeGreaterThan(2000);
  expect(errors).toEqual([]);
});
