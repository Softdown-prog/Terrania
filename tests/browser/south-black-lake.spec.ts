import { expect, test } from "@playwright/test";

/**
 * Fumaça do lago negro no jogo de verdade (ADR 0039): o lago abre, desenha água escura e margem de lama e não dá
 * erro, no desktop e no Android. A forma da costa, a profundidade e a emenda entre chunks estão provadas em
 * `tests/south-black-lake.test.ts`; aqui o objetivo é o caminho real do navegador e deixar a captura.
 */
const SEED = 842136, TILE = 32;

test("lago negro: abre com água escura e areia ao lado, sem erro (desktop/Android)", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(({ seed, x, y }) => {
    localStorage.setItem("terrania-origins-v1", JSON.stringify({ seed, x, y, hp: 100, kills: 0, defeated: [], experience: 3000 }));
    localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false }));
  }, { seed: SEED, x: 76.5 * TILE, y: 15552.5 * TILE });
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  await expect(page.locator("#coords")).toContainText("15552");
  await page.waitForTimeout(1200);
  const png = (await page.locator("canvas#game").screenshot({ path: test.info().outputPath("lago-negro.png") })).toString("base64");
  const counts = await page.evaluate(async data => {
    const image = new Image();
    image.src = "data:image/png;base64," + data;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let water = 0, sand = 0;
    for (let i = 0; i < pixels.length; i += 16) {
      const r = pixels[i]!, g = pixels[i + 1]!, b = pixels[i + 2]!;
      if (r < 60 && g < 70 && b < 80 && b >= r) water++;
      else if (r > g && g > b && r - b > 45) sand++;
    }
    return { water, sand };
  }, png);
  expect(counts.water, "água escura na tela").toBeGreaterThan(1500);
  expect(counts.sand, "areia ao lado").toBeGreaterThan(1500);
  expect(errors).toEqual([]);
});
