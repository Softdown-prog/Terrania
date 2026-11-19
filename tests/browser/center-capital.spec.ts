import { expect, test, type Page } from "@playwright/test";
import { CAPITAL, CAPITAL_PLOTS, capitalPoint, doorApproach } from "../../src/world/center/capital/index.ts";

/**
 * Muralha, Grandes Portões e torres da capital no jogo de verdade (ADR 0056): as peças aparecem pintadas (o azul dos estandartes
 * da capital) e o herói não atravessa o muro, mas passa pelo portão. Praça dos Povos (ADR 0057): o piso de pedra com a rosa dos
 * ventos dourada aparece, e o herói para diante do monumento e passa ao lado dele. Cidadela dos Povos (ADR 0058): os edifícios
 * aparecem pintados (o violeta da Academia Arcana), o herói para diante da parede do Conselho e a Grande Avenida, entre o Quartel
 * e o Conselho, continua aberta até o portão. Alameda das Guildas (ADR 0060): o telhado de cobre do Templo e o de barro da
 * Hospedaria aparecem, o herói para diante da porta do Templo e a avenida segue aberta entre a Hospedaria e a Casa da Moeda.
 * O trecho de andar sai das funções do mundo.
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

/** Pixels violeta (o vidro e os panos da Academia Arcana, #8a5ad0 a #cdaaf5): muito azul, vermelho médio e pouco verde; não pega a ardósia nem o azul-real. */
async function violetPixels(page: Page): Promise<number> {
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
    let violet = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i]!, g = pixels[i + 1]!, b = pixels[i + 2]!;
      if (b >= 190 && r >= 120 && r <= 225 && g >= 70 && g <= 185 && b - g >= 55 && r - g >= 30) violet++;
    }
    return violet;
  }, png);
}

test("a Cidadela aparece pintada: a Academia Arcana com as janelas e os panos violeta (desktop/Android)", async ({ page }) => {
  const academy = CAPITAL_PLOTS.find(p => p.id === "academia-arcana")!, [ax, ay] = doorApproach(academy);
  const errors = await start(page, ax, ay + 1);
  await page.waitForTimeout(1500);
  const violet = await violetPixels(page);
  test.info().annotations.push({ type: "pixels violeta", description: String(violet) });
  expect(violet, "o violeta da Academia na tela (sem o edifício são uns 300, da interface)").toBeGreaterThan(1200);
  await page.locator("canvas#game").screenshot({ path: test.info().outputPath("academia-arcana.png") });
  expect(errors).toEqual([]);
});

for (const way of ["parede", "avenida"] as const) {
  test(`andar para o norte na Cidadela: ${way === "parede" ? "o herói para diante da porta do Conselho" : "a Grande Avenida segue aberta entre o Quartel e o Conselho"} (desktop/Android)`, async ({ page }) => {
    const council = CAPITAL_PLOTS.find(p => p.id === "conselho")!, [ax, ay] = doorApproach(council);
    const errors = await start(page, way === "parede" ? ax : 0, ay + 1);
    const first = await readY(page);
    expect(first).toBe(CAPITAL.centerY + ay + 1);
    const goal = CAPITAL.centerY + council.y - 1; // a rua atrás dos edifícios, ao norte do terreno
    await page.keyboard.down("w");
    let last = first, since = Date.now();
    const began = Date.now();
    while (Date.now() - began < MAX_WALK_MS) {
      await page.waitForTimeout(250);
      const y = await readY(page);
      if (way === "avenida" && y <= goal) break;
      if (y !== last) { last = y; since = Date.now(); } else if (Date.now() - since > 1500) break;
    }
    await page.keyboard.up("w");
    const end = await readY(page);
    if (way === "parede") {
      expect(end, "o herói chegou à frente da porta").toBe(CAPITAL.centerY + ay);
      expect(end, "e não entrou no terreno do edifício").toBeGreaterThanOrEqual(CAPITAL.centerY + council.y + council.h);
    } else {
      expect(end, "pela passagem ele chega ao fim da Alameda e à rua de trás").toBeLessThanOrEqual(goal);
    }
    expect(errors).toEqual([]);
  });
}

/** Conta pixels de uma faixa de cor: `test` recebe (r, g, b) e diz se o pixel conta. */
async function countPixels(page: Page, kind: "copper" | "clay"): Promise<number> {
  const png = (await page.locator("canvas#game").screenshot()).toString("base64");
  return page.evaluate(async ({ data, which }) => {
    const image = new Image();
    image.src = "data:image/png;base64," + data;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let n = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i]!, g = pixels[i + 1]!, b = pixels[i + 2]!;
      // cobre do templo (#4fa896 a #9fe0cc): verde-azulado, com azul alto; a grama tem azul baixo e a interface é escura
      if (which === "copper" ? (g >= 130 && b >= 115 && r <= 150 && g - r >= 45 && b - r >= 35) : (r >= 150 && r <= 235 && g >= 60 && g <= 135 && b >= 35 && b <= 105 && r - g >= 60 && r - b >= 85)) n++;
    }
    return n;
  }, { data: png, which: kind });
}

test("a Alameda aparece pintada: o telhado de cobre do Templo e o de barro da Hospedaria (desktop/Android)", async ({ page }) => {
  const temple = CAPITAL_PLOTS.find(p => p.id === "templo")!, [tx, ty] = doorApproach(temple);
  const errors = await start(page, tx, ty + 1);
  await page.waitForTimeout(1500);
  const copper = await countPixels(page, "copper");
  test.info().annotations.push({ type: "pixels cobre", description: String(copper) });
  expect(copper, "o telhado de cobre do Templo na tela").toBeGreaterThan(5000);
  await page.locator("canvas#game").screenshot({ path: test.info().outputPath("templo.png") });
  expect(errors).toEqual([]);
});

test("a Hospedaria aparece pintada com o telhado de barro (desktop/Android)", async ({ page }) => {
  const inn = CAPITAL_PLOTS.find(p => p.id === "hospedaria")!, [ix, iy] = doorApproach(inn);
  const errors = await start(page, ix, iy + 1);
  await page.waitForTimeout(1500);
  const clay = await countPixels(page, "clay");
  test.info().annotations.push({ type: "pixels barro", description: String(clay) });
  expect(clay, "o telhado de barro da Hospedaria na tela").toBeGreaterThan(5000);
  expect(errors).toEqual([]);
});

for (const way of ["parede", "avenida"] as const) {
  test(`andar para o norte na Alameda: ${way === "parede" ? "o herói para diante da porta do Templo" : "a passagem entre a Hospedaria e a Casa da Moeda segue aberta"} (desktop/Android)`, async ({ page }) => {
    const temple = CAPITAL_PLOTS.find(p => p.id === "templo")!, [ax, ay] = doorApproach(temple);
    // a 6 tiles do eixo: o centro da praça é o monumento, e daí a passagem segue entre a Hospedaria (x -22..-12) e a Casa da Moeda (x 12..22)
    const errors = await start(page, way === "parede" ? ax : 6, ay + 1);
    const first = await readY(page);
    expect(first).toBe(CAPITAL.centerY + ay + 1);
    const goal = CAPITAL.centerY + temple.y - 1; // a rua atrás dos edifícios, ao norte do terreno
    await page.keyboard.down("w");
    let last = first, since = Date.now();
    const began = Date.now();
    while (Date.now() - began < MAX_WALK_MS) {
      await page.waitForTimeout(250);
      const y = await readY(page);
      if (way === "avenida" && y <= goal) break;
      if (y !== last) { last = y; since = Date.now(); } else if (Date.now() - since > 1500) break;
    }
    await page.keyboard.up("w");
    const end = await readY(page);
    if (way === "parede") {
      expect(end, "o herói chegou à frente da porta").toBe(CAPITAL.centerY + ay);
      expect(end, "e não entrou no terreno do edifício").toBeGreaterThanOrEqual(CAPITAL.centerY + temple.y + temple.h);
    } else {
      expect(end, "pela passagem ele chega ao fim da Alameda e à rua de trás").toBeLessThanOrEqual(goal);
    }
    expect(errors).toEqual([]);
  });
}
