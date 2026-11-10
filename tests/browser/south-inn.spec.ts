import { expect, test } from "@playwright/test";
import { NPCS } from "../../src/world/npcs.ts";
import { INN_REST_GEL_PRICE } from "../../src/engine/character/Inventory.ts";

/**
 * Descanso pago na Hospedaria Sombra do Escorpião, no jogo de verdade (ADR 0022): conversar com
 * Madame Víbora, pagar o gel e ver a vida voltar e o gel sair da bolsa salva.
 */
test("Poço Negro: Madame Víbora cobra o gel e recupera a vida do herói (desktop/Android)", async ({ page }, info) => {
  const madame = NPCS.find(npc => npc.id === "south-madame")!;
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(({ x, y, gel }) => {
    localStorage.setItem("terrania-origins-v1", JSON.stringify({
      seed: 842136, x, y, hp: 30, kills: 0, defeated: [], experience: 1350,
      inventory: { gel, potion: 0, questRewardClaimed: false },
    }));
    localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false }));
  }, { x: madame.x, y: madame.y + 24, gel: INN_REST_GEL_PRICE * 2 });
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  const press = async (locator: ReturnType<typeof page.locator>): Promise<void> => {
    if (info.project.name === "android") await locator.tap(); else await locator.click();
  };
  await press(page.getByRole("button", { name: "Conversar (E)" }));
  const dialog = page.getByRole("dialog", { name: "Madame Víbora" });
  await expect(dialog).toBeVisible();
  const rest = dialog.locator("#innRest");
  await expect(rest).toContainText(`${INN_REST_GEL_PRICE} de gel`);
  await expect(rest).toBeEnabled();
  await press(rest);
  await expect(dialog.locator("#npcTradeFeedback")).toContainText("Madame Víbora serviu o descanso");
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem("terrania-origins-v1") ?? "{}") as
    { hp: number; inventory: { gel: number } });
  expect(save.hp).toBeGreaterThan(30);
  expect(save.inventory.gel).toBe(INN_REST_GEL_PRICE);
  // Vida cheia e sem status: um segundo descanso não cobra nada.
  await press(rest);
  await expect(dialog.locator("#npcTradeFeedback")).toContainText("já está descansado");
  const again = await page.evaluate(() => JSON.parse(localStorage.getItem("terrania-origins-v1") ?? "{}") as
    { inventory: { gel: number } });
  expect(again.inventory.gel).toBe(INN_REST_GEL_PRICE);
  expect(errors).toEqual([]);
});
