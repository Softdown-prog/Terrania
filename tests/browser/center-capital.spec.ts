import { expect, test, type Page } from "@playwright/test";
import { CAPITAL, capitalPoint } from "../../src/world/center/capital/index.ts";

/**
 * Muralha, Grandes Portões e torres da capital no jogo de verdade (ADR 0056): as peças aparecem pintadas (o azul dos estandartes
 * da capital) e o herói não atravessa o muro, mas passa pelo portão. Praça dos Povos (ADR 0057): o piso de pedra com a rosa dos
 * ventos dourada aparece, e o herói para diante do monumento e passa ao lado dele. O trecho de andar sai das funções do mundo.
 */
const SEED = 842136, T = 32, MAX_WALK_MS = 25_000;

async function start(page: Page, lx: number, ly: number): Promise<string[]> {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const p = capitalPoint(lx, ly);
  await page.addInitScript(({ seed, x, y }) => {
    localStorage.setItem("terrania-origins-v1", JSON.stringify({ seed, x, y, hp: 100, kills: 0, defeated: [], experience: 3000 }));
    localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false }));
  }, { seed: SEED, x: p.x, y: p.y });
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  return errors;
}
const readY = async (page: Page): Promise<number> => Number(/Y\s+(-?\d+)/.exec(await page.locator("#coords").innerText())![1]);

/** Pixels azul-real (o azul dos estandartes da capital, #2f5fa8): pouco vermelho, verde médio e muito azul; não pega slime nem interface. */
async function royalPixels(page: Page): Promise<number> {
  const png = (await page.locator("canvas#game").screenshot()).toString("base64");
  return page.evaluate(async data => {
    const image = new Image();
    image.src = "data:image/png;base64," + data;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let royal = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i]!, g = pixels[i + 1]!, b = pixels[i + 2]!;
      if (r <= 100 && g >= 60 && g <= 140 && b >= 130 && b - g >= 45 && b - r >= 70) royal++;
    }
    return royal;
  }, png);
}

test("o Grande Portão do Norte aparece pintado, com as torres e os estandartes azuis (desktop/Android)", async ({ page }) => {
  const errors = await start(page, 0, CAPITAL.minY + 5);
  await page.waitForTimeout(1500);
  const royal = await royalPixels(page);
  test.info().annotations.push({ type: "pixels azul-real", description: String(royal) });
  expect(royal, "estandartes azuis da capital na tela").toBeGreaterThan(150);
  await page.locator("canvas#game").screenshot({ path: test.info().outputPath("portao-norte.png") });
  expect(errors).toEqual([]);
});

for (const mode of ["muro", "portao"] as const) {
  test(`andar para o sul: ${mode === "muro" ? "o herói para diante do muro" : "pelo portão ele entra na capital"} (desktop/Android)`, async ({ page }) => {
    const errors = await start(page, mode === "muro" ? -20 : 0, CAPITAL.minY - 3);
    const first = await readY(page);
    expect(first).toBe(CAPITAL.centerY + CAPITAL.minY - 3);
    const wallTop = CAPITAL.centerY + CAPITAL.minY, goal = mode === "portao" ? wallTop + 3 : Number.POSITIVE_INFINITY;
    await page.keyboard.down("s");
    let last = first, since = Date.now();
    const began = Date.now();
    while (Date.now() - began < MAX_WALK_MS) {
      await page.waitForTimeout(250);
      const y = await readY(page);
      if (y >= goal) break;
      if (y !== last) { last = y; since = Date.now(); } else if (Date.now() - since > 1500) break;
    }
    await page.keyboard.up("s");
    const end = await readY(page);
    if (mode === "muro") {
      expect(end, "o herói avançou até o muro").toBeGreaterThan(first);
      expect(end, "e parou antes da linha de pedra, sem atravessar").toBeLessThan(wallTop);
    } else {
      expect(end, "passou pelo vão do portão e entrou na cidade").toBeGreaterThanOrEqual(goal);
    }
    expect(errors).toEqual([]);
  });
}

/** Pixels do dourado incrustado na praça (#d9a63c): vermelho alto, verde médio e pouco azul; não pega a grama nem o granito das ruas. */
async function goldPixels(page: Page): Promise<number> {
  const png = (await page.locator("canvas#game").screenshot()).toString("base64");
  return page.evaluate(async data => {
    const image = new Image();
    image.src = "data:image/png;base64," + data;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let gold = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i]!, g = pixels[i + 1]!, b = pixels[i + 2]!;
      if (r >= 190 && r <= 245 && g >= 140 && g <= 195 && b <= 95 && r - b >= 110) gold++;
    }
    return gold;
  }, png);
}

test("a Praça dos Povos aparece pintada: rosa dos ventos dourada no piso e o monumento no meio (desktop/Android)", async ({ page }) => {
  const errors = await start(page, 0, -7);
  await page.waitForTimeout(1500);
  const gold = await goldPixels(page), royal = await royalPixels(page);
  test.info().annotations.push({ type: "pixels dourados / azul-real", description: `${gold} / ${royal}` });
  expect(gold, "dourado da rosa dos ventos e do sol na tela").toBeGreaterThan(400);
  expect(royal, "azul-real dos anéis, dos raios e das gemas").toBeGreaterThan(150);
  await page.locator("canvas#game").screenshot({ path: test.info().outputPath("praca-dos-povos.png") });
  expect(errors).toEqual([]);
});

for (const lane of ["eixo", "lado"] as const) {
  test(`andar para o sul na praça: ${lane === "eixo" ? "o herói para diante do monumento" : "passa ao lado do monumento"} (desktop/Android)`, async ({ page }) => {
    const errors = await start(page, lane === "eixo" ? 0 : 6, -8);
    const first = await readY(page);
    expect(first).toBe(CAPITAL.centerY - 8);
    const goal = CAPITAL.centerY + 3;
    await page.keyboard.down("s");
    let last = first, since = Date.now();
    const began = Date.now();
    while (Date.now() - began < MAX_WALK_MS) {
      await page.waitForTimeout(250);
      const y = await readY(page);
      if (lane === "lado" && y >= goal) break;
      if (y !== last) { last = y; since = Date.now(); } else if (Date.now() - since > 1500) break;
    }
    await page.keyboard.up("s");
    const end = await readY(page);
    if (lane === "eixo") {
      expect(end, "o herói avançou até o estrado").toBeGreaterThan(first);
      expect(end, "e parou antes do centro, sem atravessar o monumento").toBeLessThan(CAPITAL.centerY);
    } else {
      expect(end, "a 6 tiles do eixo a praça é livre: o herói passou da linha do monumento").toBeGreaterThanOrEqual(goal);
    }
    expect(errors).toEqual([]);
  });
}
