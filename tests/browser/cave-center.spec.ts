import { expect, test } from "@playwright/test";
import { caveEntranceInCell, isStarterCave, type CaveEntrance } from "../../src/world/caves.ts";
import { dungeonFor } from "../../src/dungeons/index.ts";

/**
 * Relato do dono: as cavernas do Centro estavam vazias. Aqui entra-se numa caverna comum do Centro (Gruta das Raízes) pela entrada de verdade e confere-se que
 * ela abre sem erro, com o nome certo, e que o povo do Centro (slimes, rato gigante, morcego de caverna, aranha das raízes, slime de musgo, cobra-cipó, besouro de raiz e cogumelo andante) vem até o herói e aparece na lista
 * de batalha. A contagem e a mistura exatas são conferidas no teste unitário (`tests/cave-central-monsters.test.ts`).
 */
const SEED = 842136;
const firstVerdant = (wantDungeon: boolean): CaveEntrance | null => {
  for (let cx = -8; cx <= 8; cx++) for (let cy = -8; cy <= 8; cy++) {
    const found = caveEntranceInCell(cx, cy, SEED);
    if (found && found.theme === "verdant" && !found.tower && !isStarterCave(found) && Boolean(dungeonFor(found)) === wantDungeon) return found;
  }
  return null;
};
const entrance = firstVerdant(false); // uma Gruta das Raízes comum (um andar só)
const dungeon = firstVerdant(true); // uma Masmorra das Raízes (ADR 0094): começa nas Raízes Rasas

test("entrar numa caverna comum do Centro: abre sem erro e tem o povo do Centro dentro, na lista de batalha (desktop/Android)", async ({ page }, info) => {
  expect(entrance, "há uma caverna do Centro perto do começo do mundo").not.toBeNull();
  if (!entrance) return;
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(({ seed, x, y }) => {
    localStorage.setItem("terrania-origins-v1", JSON.stringify({ seed, x, y, hp: 100, kills: 0, defeated: [] }));
    localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false }));
  }, { seed: SEED, x: entrance.x, y: entrance.y });
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  const action = page.locator("#talkButton");
  await expect(action).toContainText("Entrar (E)");
  if (info.project.name === "android") await action.tap(); else await action.click();
  await expect(page.locator("#coords")).toContainText("Subsolo");
  await expect(page.locator("#quest")).toHaveText("Gruta das Raízes");
  await expect(page.locator("#battleSidebar")).toBeVisible(); // a lista de batalha vale também dentro da caverna (ADR 0084)
  // as criaturas perseguem a partir de 245 px: com o herói parado, as mais próximas chegam e entram na lista (só nomes do povo do Centro)
  await expect.poll(() => page.locator("#battleRows .battle-entry strong").allTextContents(), { timeout: 25_000 }).not.toEqual([]);
  const names = await page.locator("#battleRows .battle-entry strong").allTextContents();
  for (const name of names) expect(["Slime", "Rato Gigante", "Morcego de Caverna", "Aranha das Raízes", "Slime de Musgo", "Cobra-Cipó", "Besouro de Raiz", "Cogumelo Andante"]).toContain(name);
  await page.locator("canvas#game").screenshot({ path: test.info().outputPath("caverna-do-centro.png") });
  expect(errors).toEqual([]);
});

test("entrar na Masmorra das Raízes: abre no primeiro andar, sem erro, só com o povo das Raízes Rasas (desktop/Android)", async ({ page }, info) => {
  expect(dungeon, "há uma Masmorra das Raízes perto do começo do mundo").not.toBeNull();
  if (!dungeon) return;
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(({ seed, x, y }) => {
    localStorage.setItem("terrania-origins-v1", JSON.stringify({ seed, x, y, hp: 100, kills: 0, defeated: [] }));
    localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false }));
  }, { seed: SEED, x: dungeon.x, y: dungeon.y });
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  const action = page.locator("#talkButton");
  await expect(action).toContainText("Entrar (E)");
  if (info.project.name === "android") await action.tap(); else await action.click();
  await expect(page.locator("#coords")).toContainText("Subsolo");
  await expect(page.locator("#questProgress")).toContainText(/^Andar 1 de [23] · Raízes Rasas$/);
  await expect(page.locator("#battleSidebar")).toBeVisible();
  await expect.poll(() => page.locator("#battleRows .battle-entry strong").allTextContents(), { timeout: 25_000 }).not.toEqual([]);
  const names = await page.locator("#battleRows .battle-entry strong").allTextContents();
  // o primeiro andar não tem elite nem chefe: a Raiz-Viva e o Ent Ancião ficam para os andares de baixo
  for (const name of names) expect(["Rato Gigante", "Morcego de Caverna", "Aranha das Raízes", "Slime de Musgo", "Besouro de Raiz"]).toContain(name);
  expect(errors).toEqual([]);
});
