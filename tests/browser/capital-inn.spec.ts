import { expect, test, type Page } from "@playwright/test";
import { CAPITAL_DOORS, capitalDoorId } from "../../src/world/center/capital/index.ts";
import { INNKEEPER_ID } from "../../src/npcs/center/capital/index.ts";
import { NPCS } from "../../src/world/npcs.ts";
import { INN_REST_PRICE } from "../../src/engine/character/Inventory.ts";

/**
 * Hospedaria dos Viajantes da capital no jogo de verdade (ADR 0062): a porta abre o interior, o painel diz que o lugar é
 * Concórdia, a saída devolve o herói à rua, e Dona Brígida cobra as moedas e recupera a vida (mesma regra da Madame Víbora).
 */
const SEED = 842136;
const door = CAPITAL_DOORS.find(d => d.id === capitalDoorId("hospedaria"))!;
const brigida = NPCS.find(npc => npc.id === INNKEEPER_ID)!;

async function start(page: Page, x: number, y: number, hp: number, coins: number): Promise<string[]> {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(({ seed, x, y, hp, coins }) => {
    localStorage.setItem("terrania-origins-v1", JSON.stringify({
      mapVersion: 2, seed, x, y, hp, kills: 0, defeated: [], experience: 1350,
      inventory: { gel: 50, potion: 0, questRewardClaimed: false, coins },
    }));
    localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false }));
  }, { seed: SEED, x, y, hp, coins });
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  return errors;
}

test("Capital: a porta da Hospedaria abre o interior em Concórdia e a saída volta à rua (desktop/Android)", async ({ page }, info) => {
  const errors = await start(page, door.x, door.y, 100, 0);
  const action = page.locator("#talkButton");
  const press = async (): Promise<void> => {
    if (info.project.name === "android") await action.tap(); else await action.click();
  };
  await expect(action).toContainText("Entrar (E)");
  await press();
  await expect(action).toContainText("Sair (E)");
  await expect(page.locator("#quest")).toContainText("Hospedaria dos Viajantes");
  await expect(page.locator("#coords")).toHaveText("Interior · Concórdia");
  await page.locator("canvas#game").screenshot({ path: test.info().outputPath("hospedaria-interior.png") });
  await press();
  await expect(page.locator("#coords")).not.toContainText("Interior");
  await expect(action).toContainText("Entrar (E)");
  expect(errors).toEqual([]);
});

test("Capital: Dona Brígida cobra as moedas e recupera a vida do herói (desktop/Android)", async ({ page }, info) => {
  const errors = await start(page, brigida.x, brigida.y + 24, 30, INN_REST_PRICE * 2);
  const press = async (locator: ReturnType<typeof page.locator>): Promise<void> => {
    if (info.project.name === "android") await locator.tap(); else await locator.click();
  };
  await press(page.getByRole("button", { name: "Conversar (E)" }));
  const dialog = page.getByRole("dialog", { name: "Dona Brígida" });
  await expect(dialog).toBeVisible();
  const rest = dialog.locator("#innRest");
  await expect(rest).toContainText(`${INN_REST_PRICE} Terrania Gold`);
  await expect(rest).toBeEnabled();
  await press(rest);
  await expect(dialog.locator("#npcTradeFeedback")).toContainText("Dona Brígida serviu o descanso");
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem("terrania-origins-v1") ?? "{}") as
    { hp: number; inventory: { gel: number; coins: number } });
  const save = await read();
  expect(save.hp).toBeGreaterThan(30);
  expect(save.inventory.coins).toBe(INN_REST_PRICE);
  expect(save.inventory.gel).toBe(50);
  // Vida cheia e sem status: um segundo descanso não cobra nada.
  await press(rest);
  await expect(dialog.locator("#npcTradeFeedback")).toContainText("já está descansado");
  expect((await read()).inventory.coins).toBe(INN_REST_PRICE);
  expect(errors).toEqual([]);
});
