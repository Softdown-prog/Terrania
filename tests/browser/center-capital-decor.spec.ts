import { expect, test, type Page } from "@playwright/test";
import { CAPITAL_TREES, TREE_TRUNK_RADIUS, capitalPoint } from "../../src/world/center/capital/index.ts";

/**
 * Vida na capital no jogo de verdade (ADR 0106): as árvores dos terrenos vazios (cerejeiras rosa, carvalhos, ciprestes) e os lampiões das avenidas aparecem pintados, e o herói
 * não atravessa o pé de uma árvore. O trecho de andar parte de um ponto livre, uma árvore à frente.
 */
const SEED = 842136, T = 32;

async function start(page: Page, x: number, y: number): Promise<string[]> {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(({ seed, x, y }) => {
    localStorage.setItem("terrania-origins-v1", JSON.stringify({ mapVersion: 2, seed, x, y, hp: 100, kills: 0, defeated: [], experience: 3000 }));
    localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false }));
  }, { seed: SEED, x, y });
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  return errors;
}
const readX = async (page: Page): Promise<number> => Number(/X\s+(-?\d+)/.exec(await page.locator("#coords").innerText())![1]);

/** Quantos pixels da captura casam com a cor: o rosa da flor da cerejeira e o amarelo do vidro do lampião. */
async function pixels(page: Page, kind: "blossom" | "lamp"): Promise<number> {
  const png = (await page.locator("canvas#game").screenshot()).toString("base64");
  return page.evaluate(async ({ data, kind }) => {
    const image = new Image(); image.src = "data:image/png;base64," + data; await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext("2d")!; ctx.drawImage(image, 0, 0);
    const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i]!, g = d[i + 1]!, b = d[i + 2]!;
      if (kind === "blossom" ? r >= 225 && g >= 150 && g <= 195 && b >= 170 && b <= 215 && r - g >= 40 : r >= 245 && g >= 190 && g <= 235 && b >= 80 && b <= 140) n++;
    }
    return n;
  }, { data: png, kind });
}

test("os terrenos vazios do Bairro ganham cerejeiras e a Grande Avenida ganha lampiões: as duas cores aparecem na tela (desktop/Android)", async ({ page }) => {
  const errors = await start(page, capitalPoint(-16, 12).x, capitalPoint(-16, 12).y);
  await page.waitForTimeout(1500);
  const blossom = await pixels(page, "blossom");
  test.info().annotations.push({ type: "pixels de flor", description: String(blossom) });
  expect(blossom, "flor de cerejeira na tela").toBeGreaterThan(400);
  await page.locator("canvas#game").screenshot({ path: test.info().outputPath("bairro-com-arvores.png") });
  expect(errors).toEqual([]);
});

test("a Grande Avenida tem lampiões acesos nas bordas da pista (desktop/Android)", async ({ page }) => {
  const errors = await start(page, capitalPoint(0, -17).x, capitalPoint(0, -17).y);
  await page.waitForTimeout(1500);
  const lamp = await pixels(page, "lamp");
  test.info().annotations.push({ type: "pixels de lampião", description: String(lamp) });
  expect(lamp, "vidro aceso dos lampiões na tela").toBeGreaterThan(40);
  expect(errors).toEqual([]);
});

test("andar para o leste: o herói para diante do pé de uma árvore do terreno vazio (desktop/Android)", async ({ page }) => {
  const tree = CAPITAL_TREES.find(t => t.id!.startsWith("arvore-forjas"))!;
  const errors = await start(page, tree.x - 44, tree.y);
  const first = await readX(page);
  expect(first).toBe(Math.floor((tree.x - 44) / T));
  await page.keyboard.down("d");
  await page.waitForTimeout(2500);
  await page.keyboard.up("d");
  const stopped = await readX(page);
  const limit = Math.floor((tree.x - TREE_TRUNK_RADIUS - 7 + 1) / T);
  expect(stopped, "parou antes do tronco").toBeLessThanOrEqual(limit);
  expect(stopped, "e andou até lá").toBeGreaterThanOrEqual(first);
  // soltou a tecla e esperou mais um pouco: não avançou
  await page.waitForTimeout(500);
  expect(await readX(page)).toBe(stopped);
  expect(errors).toEqual([]);
});
