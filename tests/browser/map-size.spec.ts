import { expect, test, type Page } from "@playwright/test";
import { ANTES, MAP_EDGE_TILES } from "../../src/world/mapSize.ts";
import { SOUTH_CITY } from "../../src/world/southCity.ts";

/**
 * O mapa pela metade no jogo de verdade (ADR 0059): um save do mapa antigo (sem `mapVersion`) com o herói no Poço Negro
 * antigo chega ao Poço Negro novo, e um com o herói além da parede nova volta à Vila. O save novo não é migrado.
 */
const SEED = 842136, T = 32;
const readY = async (page: Page): Promise<number> => Number(/Y\s+(-?\d+)/.exec(await page.locator("#coords").innerText())![1]);

async function open(page: Page, save: Record<string, unknown>): Promise<string[]> {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(data => {
    localStorage.setItem("terrania-origins-v1", JSON.stringify(data));
    localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false }));
  }, { seed: SEED, hp: 100, kills: 0, defeated: [], experience: 3000, ...save });
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  await page.waitForTimeout(800);
  return errors;
}

test("save do mapa antigo no Poço Negro antigo: o herói chega ao Poço Negro novo, no mesmo ponto da cidade (desktop/Android)", async ({ page }) => {
  const errors = await open(page, { x: 0.5 * T, y: (ANTES.southCityDistanceTiles + 8.5) * T });
  expect(await readY(page), "oito tiles ao sul do centro da cidade nova").toBe(SOUTH_CITY.centerY + 8);
  await expect(page.locator("#coords")).not.toContainText(String(ANTES.southCityDistanceTiles));
  expect(errors).toEqual([]);
});

test("save novo (com a versão) na mesma altura não é arrastado, e o save além da parede nova volta à Vila (desktop/Android)", async ({ page }) => {
  const errors = await open(page, { mapVersion: 2, x: 0.5 * T, y: (ANTES.southCityDistanceTiles + 40.5) * T });
  expect(await readY(page), "o save novo fica onde está, no deserto aberto").toBe(ANTES.southCityDistanceTiles + 40);
  expect(errors).toEqual([]);
});

test("herói além da parede nova de um save antigo volta ao ponto inicial da Vila (desktop/Android)", async ({ page }) => {
  const errors = await open(page, { x: 0.5 * T, y: (MAP_EDGE_TILES + 3000) * T });
  await expect(page.locator("#coords")).toContainText("Y 0");
  expect(errors).toEqual([]);
});
