import { expect, test } from "@playwright/test";
import { NEW_PLAYER_STATE } from "./support/returning-player.ts";
import { centerSurfaceSpawns } from "../../src/actors/centerSpawns.ts";
import { CREATURE_CATALOG } from "../../src/monsters/catalog.ts";

/**
 * Os bichos médios do Centro na superfície (ADR 0089): longe da vila, o jogo de verdade povoa o entorno com javali, lobo cinzento e cogumelo andante. Aqui o
 * herói começa a poucos tiles de um encontro sorteado pela própria semente e a lista de batalha tem de mostrar um deles, pelo nome da ficha. Desktop e Android.
 */
test.use({ storageState: NEW_PLAYER_STATE });
const SEED = 842136;
const found = (() => {
  for (let r = 16; r < 120; r++) for (let cx = -r; cx <= r; cx++) for (const cy of [-r, r]) { const mobs = centerSurfaceSpawns(cx, cy, SEED); if (mobs.length) return mobs; }
  return null;
})();

test("longe da vila, a lista de batalha mostra um bicho do Centro (javali, lobo ou cogumelo) (desktop/Android)", async ({ page }, info) => {
  expect(found, "há um encontro do Centro para visitar").not.toBeNull();
  if (!found) return;
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const first = found[0]!;
  // o herói começa 3 tiles ao lado do primeiro, com a vida cheia para o teste não depender de sobreviver
  const save = JSON.stringify({ mapVersion: 2, seed: SEED, x: first.x + 96, y: first.y, hp: 150, kills: 0, defeated: [], experience: 0 });
  await page.addInitScript(([key, value, preferences]) => { if (localStorage.getItem(key!) === null) localStorage.setItem(key!, value!); localStorage.setItem("terrania-preferences-v1", preferences!); },
    ["terrania-origins-v1", save, JSON.stringify({ zoom: 1, effects: false, cameraMotion: false })]);
  await page.setViewportSize(info.project.name === "android" ? { width: 390, height: 844 } : { width: 1200, height: 800 });
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  const expected = CREATURE_CATALOG[first.kind].name;
  await expect.poll(() => page.locator("#battleRows .battle-entry strong").allTextContents(), { timeout: 20_000 }).toContain(expected);
  await page.locator("canvas#game").screenshot({ path: test.info().outputPath("centro-bicho-na-superficie.png") });
  expect(errors).toEqual([]);
});
