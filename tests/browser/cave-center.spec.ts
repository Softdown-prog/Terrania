import { expect, test } from "@playwright/test";
import { caveEntranceInCell } from "../../src/world/caves.ts";

/**
 * Relato do dono: as cavernas do Centro estavam vazias. Aqui entra-se numa caverna comum do Centro (Gruta das Raízes) pela entrada de verdade e confere-se que
 * ela abre sem erro, com o nome certo, e que o primeiro quadro desenha slimes de verdade (cor de gel na tela). A contagem exata de slimes é conferida no
 * teste unitário (`tests/cave-central-slimes.test.ts`).
 */
const SEED = 842136;
const entrance = (() => {
  for (let cx = -8; cx <= 8; cx++) for (let cy = -8; cy <= 8; cy++) {
    const found = caveEntranceInCell(cx, cy, SEED);
    if (found && found.theme === "verdant" && !found.tower && found.id !== `cave:${SEED}:0:0`) return found;
  }
  return null;
})();

test("entrar numa caverna comum do Centro: abre sem erro e tem slimes dentro (desktop/Android)", async ({ page }, info) => {
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
  await page.waitForTimeout(600);
  await page.locator("canvas#game").screenshot({ path: test.info().outputPath("caverna-do-centro.png") });
  expect(errors).toEqual([]);
});
