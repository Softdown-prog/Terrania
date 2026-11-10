import { expect, test } from "@playwright/test";

/**
 * Moedas no chão no jogo de verdade (ADR 0024): o mundo carrega as moedas deixadas, o herói anda até
 * elas, elas entram na carteira e aparecem na bolsa (250 = 2 Cripta Coin e 50 Terrania Gold).
 */
test("moedas no chão são recolhidas ao andar até elas e aparecem na bolsa (desktop/Android)", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem("terrania-origins-v1", JSON.stringify({
      seed: 842136, x: 16, y: 16, hp: 100, kills: 0, experience: 0,
      defeated: ["criatura-a", "criatura-b"],
      drops: [{ id: "criatura-a:coin", item: "coin", x: 84, y: 16, amount: 200 },
        { id: "criatura-b:coin", item: "coin", x: 122, y: 16, amount: 50 }],
      inventory: { gel: 0, potion: 0, questRewardClaimed: false },
    }));
    localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false }));
  });
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  await page.locator("canvas#game").focus();
  const wallet = (): Promise<number> => page.evaluate(() =>
    (JSON.parse(localStorage.getItem("terrania-origins-v1") ?? "{}") as { inventory?: { coins?: number } }).inventory?.coins ?? 0);
  expect(await wallet()).toBe(0);
  // O herói anda para a direita até as duas moedas entrarem na carteira.
  for (let step = 0; step < 40 && (await wallet()) < 250; step++) {
    await page.keyboard.down("d");
    await page.waitForTimeout(120);
    await page.keyboard.up("d");
  }
  expect(await wallet()).toBe(250);
  await page.locator("#gameMenuButton").click();
  await page.locator("#inventoryButton").click();
  const bagTab = page.locator("#inventoryTabBag");
  if (await bagTab.isVisible()) await bagTab.click();
  await expect(page.locator('[data-bag-item="coin-cripta-coin"] .backpack-quantity')).toHaveText("2");
  await expect(page.locator('[data-bag-item="coin-terrania-gold"] .backpack-quantity')).toHaveText("50");
  expect(errors).toEqual([]);
});
