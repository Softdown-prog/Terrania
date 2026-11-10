import { expect, test } from "@playwright/test";
import { getSouthTowerForCell } from "../../src/world/towers/placement.ts";
import { towerEntrance } from "../../src/world/towers/entrance.ts";
import { CaveRoom } from "../../src/engine/rooms/CaveRoom.ts";

/**
 * Entrar numa torre do Sul pela porta e sair pela mesma porta, no jogo de verdade (ADR 0020).
 * Os andares e a troca de andar já têm os testes de caverna; aqui vale a porta, o título e a volta.
 */
const SEED = 842136;
function towerWithThreeFloors() {
  for (let cy = 24; cy < 70; cy++) for (let cx = -10; cx <= 10; cx++) {
    const placed = getSouthTowerForCell(cx, cy, SEED);
    if (placed && placed.tower.floors === 3) return placed;
  }
  throw new Error("nenhuma torre de 3 andares nos arredores");
}

test("torre do Sul: entrar pela porta, ver o andar e sair pela mesma porta (desktop/Android)", async ({ page }, info) => {
  test.setTimeout(120_000);
  const door = towerEntrance(towerWithThreeFloors(), SEED);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const defeated = [1, 2, 3].flatMap(floorIndex =>
    [...new CaveRoom(door, 100, 100, new Set(), { floorIndex }).monsters.keys()]);
  await page.addInitScript(({ x, y, defeated }) => {
    localStorage.setItem("terrania-origins-v1", JSON.stringify({
      seed: 842136, x, y, hp: 1090, kills: 0, defeated, experience: 148500,
    }));
    localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false }));
  }, { x: door.x, y: door.y, defeated });
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  const action = page.locator("#talkButton");
  const press = async (): Promise<void> => {
    if (info.project.name === "android") await action.tap(); else await action.click();
  };
  await expect(action).toContainText("Entrar (E)");
  await press();

  await expect(page.locator("#questProgress")).toContainText(`Andar 1 de 3 · `);
  await expect(page.locator("#coords")).toContainText("Torre");
  await expect(page.getByText("EXPLORAÇÃO · TORRE", { exact: true })).toBeVisible();
  await expect(page.locator("#gameNotice")).toContainText(`Você entrou em ${door.name}`);
  await page.locator("canvas#game").focus();
  await page.locator("canvas#game").screenshot({ path: test.info().outputPath("torre-andar-1.png") });

  // O herói chega 3 tiles ao norte da escada de saída: anda para o sul até o botão pedir "Sair".
  for (let step = 0; step < 30 && !(await action.isVisible()); step++) {
    await page.keyboard.down("s");
    await page.waitForTimeout(110);
    await page.keyboard.up("s");
  }
  await expect(action).toContainText("Subir (E)");
  await press();
  await expect(page.locator("#coords")).toHaveText(`X ${door.tileX} · Y ${door.tileY}`);
  await expect(page.locator("#gameNotice")).toContainText("retornou à superfície");
  expect(errors).toEqual([]);
});
