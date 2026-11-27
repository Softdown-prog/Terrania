import { expect, test, type Page } from "@playwright/test";

/**
 * Viagem pelo mapa (ADR 0099), no jogo de verdade: abrir o Mapa do mundo, clicar num ponto, "Viajar até aqui" e ver o herói andar sozinho até lá; cancelar pelo botão e
 * por uma tecla de andar. Os destinos ficam a algumas dezenas de tiles da Vila (a escala "Arredores" mostra 128 tiles de lado).
 */
const tileOf = async (page: Page): Promise<{ x: number; y: number }> => {
  const match = /X\s+(-?\d+)\s+·\s+Y\s+(-?\d+)/.exec(await page.locator("#coords").innerText());
  return { x: Number(match![1]), y: Number(match![2]) };
};
async function open(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false })));
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  await page.waitForTimeout(600);
  return errors;
}
/** Abre o mapa nos Arredores (128 tiles de lado, o herói no centro) e clica `tiles` tiles à direita do herói. */
async function pickEast(page: Page, tiles: number): Promise<void> {
  await page.locator("#gameMenuButton").click();
  await page.locator("#inventoryButton").click();
  await page.locator("#inventoryTabMap").click();
  await page.locator("#mapScaleNearby").click();
  const canvas = page.locator("#worldAtlasCanvas");
  await expect(canvas).toBeVisible();
  await expect(page.locator("#atlasTravelHint")).toBeVisible();
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + box.width * (.5 + tiles / 128), box.y + box.height * .5);
  await expect(page.locator("#atlasTravelTarget")).toContainText("Destino");
}

test("clicar no mapa e viajar: o herói anda sozinho até lá, o mapa fecha e a chegada é avisada (desktop/Android)", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = await open(page);
  const start = await tileOf(page);
  await pickEast(page, 26);
  await page.locator("#atlasTravelGo").click();
  await expect(page.locator("#worldAtlasCanvas")).toHaveCount(0); // o mapa fechou
  await expect(page.locator("#journeyBar")).toBeVisible();
  await expect(page.locator("#journeyBar")).toContainText("faltam");
  await expect.poll(async () => (await tileOf(page)).x, { timeout: 60_000 }).toBeGreaterThan(start.x + 18);
  await expect(page.locator("#journeyBar")).toHaveCount(0, { timeout: 60_000 });
  await expect(page.locator("#gameNotice")).toContainText("chegou ao destino");
  const end = await tileOf(page);
  expect(Math.abs(end.x - (start.x + 26)), "parou perto do destino (pode ter caído no chão andável mais perto)").toBeLessThan(14);
  expect(errors).toEqual([]);
});

test("cancelar pelo botão da tela para a viagem e o herói (desktop/Android)", async ({ page }) => {
  test.setTimeout(90_000);
  const errors = await open(page);
  await pickEast(page, 50);
  await page.locator("#atlasTravelGo").click();
  await expect(page.locator("#journeyBar")).toBeVisible();
  await page.waitForTimeout(2500);
  await page.locator("#journeyCancel").click();
  await expect(page.locator("#journeyBar")).toHaveCount(0);
  await expect(page.locator("#gameNotice")).toContainText("Viagem cancelada");
  await page.waitForTimeout(700);
  const stopped = await tileOf(page);
  await page.waitForTimeout(1500);
  expect(await tileOf(page), "o herói parou").toEqual(stopped);
  expect(errors).toEqual([]);
});

test("apertar uma tecla de andar assume o controle e cancela a viagem (desktop/Android)", async ({ page }) => {
  test.setTimeout(90_000);
  const errors = await open(page);
  await pickEast(page, 50);
  await page.locator("#atlasTravelGo").click();
  await expect(page.locator("#journeyBar")).toBeVisible();
  await page.waitForTimeout(1800);
  await page.keyboard.down("w"); await page.waitForTimeout(250); await page.keyboard.up("w");
  await expect(page.locator("#journeyBar")).toHaveCount(0);
  await expect(page.locator("#gameNotice")).toContainText("Viagem cancelada");
  expect(errors).toEqual([]);
});

test("sem destino escolhido o mapa mostra a dica e nenhum botão de viajar (desktop/Android)", async ({ page }) => {
  const errors = await open(page);
  await page.locator("#gameMenuButton").click();
  await page.locator("#inventoryButton").click();
  await page.locator("#inventoryTabMap").click();
  await expect(page.locator("#atlasTravelHint")).toBeVisible();
  await expect(page.locator("#atlasTravelGo")).toHaveCount(0); // sem destino escolhido, não há botão
  expect(errors).toEqual([]);
});
