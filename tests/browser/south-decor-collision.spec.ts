import { expect, test } from "@playwright/test";
import { canWalkOnSeed } from "../../src/world/collision.ts";
import { TILE_SIZE } from "../../src/world/terrain.ts";
import { DECOR_FOOTPRINT, decorShapeOf, southDecorAt } from "../../src/world/south/decor/index.ts";

/**
 * A colisão da decoração no jogo de verdade (ADR 0037): o herói andando para a direita para diante do cacto e,
 * num trecho livre, anda bem mais longe no mesmo tempo. Os dois trechos saem das mesmas funções do mundo que a
 * colisão usa.
 */
const SEED = 842136, MAX_WALK_MS = 20_000;

/** Trecho em que dá para andar `length` px para a direita sem esbarrar em nada, a partir de (x, y). */
const clear = (x: number, y: number, length: number): boolean => {
  for (let d = 0; d <= length; d += 4) if (!canWalkOnSeed(x + d, y, SEED)) return false;
  return true;
};

/** Um cacto cuja frente (à esquerda) tem `lead` px livres até ele. */
function cactusAhead(lead: number): { x: number; y: number; cx: number; edge: number } {
  for (let ty = 15560; ty < 15700; ty++) for (let tx = -150; tx < 150; tx++) {
    const p = southDecorAt(tx, ty, SEED);
    if (!p || p.kind !== "cactus") continue;
    const radius = DECOR_FOOTPRINT.cactus[decorShapeOf(p.variation)]!;
    const cx = tx * TILE_SIZE + p.x, cy = ty * TILE_SIZE + p.y, edge = cx - radius - 7;
    if (clear(edge - lead, cy, lead)) return { x: edge - lead, y: cy, cx, edge };
  }
  throw new Error("sem cacto com frente livre");
}
function openRow(length: number): { x: number; y: number } {
  for (let ty = 15560; ty < 15700; ty++) for (let tx = -150; tx < 150; tx++) {
    const x = tx * TILE_SIZE + 16, y = ty * TILE_SIZE + 16;
    if (clear(x, y, length)) return { x, y };
  }
  throw new Error("sem trecho livre");
}

for (const mode of ["cacto", "livre"] as const) {
  test(`andar para a direita: ${mode === "cacto" ? "o herói para diante do cacto" : "num trecho livre ele segue"} (desktop/Android)`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const cactus = cactusAhead(150);
    const start = mode === "cacto" ? { x: cactus.x, y: cactus.y } : openRow(420);
    await page.addInitScript(({ seed, x, y }) => {
      localStorage.setItem("terrania-origins-v1", JSON.stringify({ seed, x, y, hp: 100, kills: 0, defeated: [], experience: 3000 }));
      localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false }));
    }, { seed: SEED, x: start.x, y: start.y });
    await page.goto("/jogar/?modo=solo");
    await expect(page.locator("canvas#game")).toBeVisible();
    const readX = async (): Promise<number> => Number(/X\s+(-?\d+)/.exec(await page.locator("#coords").innerText())![1]);
    const first = await readX();
    expect(first).toBe(Math.floor(start.x / TILE_SIZE));
    // Segura a tecla até o herói chegar ao alvo (trecho livre) ou parar de vez (cacto), sem depender da velocidade.
    const goal = mode === "livre" ? first + 8 : Number.POSITIVE_INFINITY;
    await page.keyboard.down("d");
    let last = first, since = Date.now();
    const began = Date.now();
    while (Date.now() - began < MAX_WALK_MS) {
      await page.waitForTimeout(250);
      const x = await readX();
      if (x !== last) { last = x; since = Date.now(); }
      if (last >= goal || (last > first && Date.now() - since > 2500)) break;
    }
    await page.keyboard.up("d");
    await page.locator("canvas#game").screenshot({ path: test.info().outputPath(`${mode}.png`) });
    if (mode === "cacto") {
      expect(last, "andou até a frente do cacto").toBeGreaterThanOrEqual(Math.floor(cactus.edge / TILE_SIZE) - 1);
      expect(last, "e não passou dele").toBeLessThanOrEqual(Math.floor(cactus.cx / TILE_SIZE));
    } else {
      expect(last, "num trecho livre anda bem mais longe").toBeGreaterThanOrEqual(first + 8);
    }
    expect(errors).toEqual([]);
  });
}
