import { expect, test } from "@playwright/test";
import { caveEntranceInCell, isStarterCave, type CaveEntrance } from "../../src/world/caves.ts";

/**
 * Relato do dono: as cavernas do Centro estavam pequenas e vazias. Desde o ADR 0101 toda gruta verde (menos a do começo do jogo) é a Masmorra das Raízes, de cinco andares.
 * Aqui entra-se numa delas pela entrada de verdade e confere-se que abre sem erro, no primeiro andar (Raízes Rasas), e que o povo das Raízes vem até o herói e aparece na lista
 * de batalha. A mistura exata de cada andar é conferida nos testes unitários (`tests/center-dungeon.test.ts`, `tests/center-dungeon-creatures.test.ts`).
 */
const SEED = 842136;
const firstVerdant = (): CaveEntrance | null => {
  for (let cx = -8; cx <= 8; cx++) for (let cy = -8; cy <= 8; cy++) {
    const found = caveEntranceInCell(cx, cy, SEED);
    if (found && found.theme === "verdant" && !found.tower && !isStarterCave(found)) return found;
  }
  return null;
};
const dungeon = firstVerdant(); // uma Masmorra das Raízes (ADR 0094/0101): começa nas Raízes Rasas

test("entrar numa gruta verde do Centro: é a Masmorra das Raízes, abre no primeiro andar, sem erro, só com o povo das Raízes Rasas (desktop/Android)", async ({ page }, info) => {
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
  await expect(page.locator("#questProgress")).toContainText(/^Andar 1 de [35] · Raízes Rasas$/);
  await expect(page.locator("#battleSidebar")).toBeVisible();
  await expect.poll(() => page.locator("#battleRows .battle-entry strong").allTextContents(), { timeout: 25_000 }).not.toEqual([]);
  const names = await page.locator("#battleRows .battle-entry strong").allTextContents();
  // o primeiro andar não tem elite nem chefe: a Raiz-Viva e o Ent Ancião ficam para os andares de baixo
  for (const name of names) expect(["Rato Gigante", "Morcego de Caverna", "Aranha das Raízes", "Slime de Musgo", "Besouro de Raiz"]).toContain(name);
  expect(errors).toEqual([]);
});
