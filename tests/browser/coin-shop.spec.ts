import { expect, test } from "@playwright/test";
import { NPCS } from "../../src/world/npcs.ts";
import { FOODS } from "../../src/engine/character/Food.ts";

/**
 * Compra com moedas no jogo de verdade (ADR 0025): a comida da Lina custa Terrania Gold, o botão de
 * quem não tem moeda suficiente fica desabilitado (mesmo com gel de sobra) e a poção segue sendo troca de gel.
 */
test("Lina vende comida por moedas e a poção continua sendo troca de gel (desktop/Android)", async ({ page }, info) => {
  const lina = NPCS.find(npc => npc.id === "lina")!;
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(({ x, y }) => {
    localStorage.setItem("terrania-origins-v1", JSON.stringify({
      seed: 842136, x, y, hp: 100, kills: 0, defeated: [], experience: 0,
      inventory: { gel: 9, potion: 0, questRewardClaimed: false, coins: 14 },
    }));
    localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false }));
  }, { x: lina.x, y: lina.y + 24 });
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  const press = async (locator: ReturnType<typeof page.locator>): Promise<void> => {
    if (info.project.name === "android") await locator.tap(); else await locator.click();
  };
  await press(page.getByRole("button", { name: "Conversar (E)" }));
  const dialog = page.getByRole("dialog", { name: "Lina" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("#buy-apple")).toContainText(`${FOODS.apple.price} Terrania Gold`);
  await expect(dialog.locator("#buy-apple")).toBeEnabled();
  await expect(dialog.locator("#buy-bread")).toBeEnabled();
  await expect(dialog.locator("#buy-meat")).toBeDisabled(); // 14 Terrania Gold não pagam 18, mesmo com 9 de gel
  await press(dialog.locator("#buy-bread"));
  await expect(dialog.locator("#npcTradeFeedback")).toContainText("Lina entregou Pão");
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem("terrania-origins-v1") ?? "{}") as
    { inventory: { gel: number; coins: number; food: { bread: number } } });
  expect(save.inventory.coins).toBe(14 - FOODS.bread.price);
  expect(save.inventory.gel).toBe(9);
  expect(save.inventory.food.bread).toBe(1);
  // A poção é troca: custa gel e não toca nas moedas.
  await press(dialog.getByRole("button", { name: "Trocar 3 de gel por 1 poção" }));
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem("terrania-origins-v1") ?? "{}") as
    { inventory: { gel: number; coins: number; potion: number } });
  expect(after.inventory).toMatchObject({ gel: 6, potion: 1, coins: 14 - FOODS.bread.price });
  expect(errors).toEqual([]);
});
