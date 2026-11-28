import { expect, test, type Page } from "@playwright/test";
import { CAPITAL_DOORS } from "../../src/world/center/capital/index.ts";
import { ARCHER_MASTER_ID } from "../../src/npcs/center/capital/index.ts";
import { NPCS } from "../../src/world/npcs.ts";
import { NEW_PLAYER_STATE } from "./support/returning-player.ts";

/**
 * A Irmandade dos Arqueiros no jogo de verdade (ADR 0118): a porta abre o salão em Concórdia; o Mestre Orlan vende ao Arqueiro o pacote de dez flechas
 * de junco por 1 Terrania Gold e o de ferro por 3 (com o save conferido), deixa trocar a flecha em uso e não vende nada ao Cavaleiro.
 */
test.use({ storageState: NEW_PLAYER_STATE });
const SEED = 842136;
const door = CAPITAL_DOORS.find(d => d.id === "capital-arqueiros")!;
const master = NPCS.find(npc => npc.id === ARCHER_MASTER_ID)!;

async function start(page: Page, x: number, y: number, extra: Record<string, unknown>): Promise<string[]> {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(({ seed, x, y, extra }) => {
    if (!localStorage.getItem("terrania-origins-v1")) localStorage.setItem("terrania-origins-v1", JSON.stringify({ mapVersion: 2, seed, x, y, hp: 150, kills: 0, defeated: [], ...extra }));
    localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false }));
  }, { seed: SEED, x, y, extra });
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  return errors;
}
type Save = { inventory: { coins?: number; quiver?: { counts: Record<string, number>; equipped: string } } };
const readSave = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("terrania-origins-v1") ?? "{}") as Save);
const archer = (coins: number) => ({ heroClass: "archer", inventory: { gel: 0, potion: 0, questRewardClaimed: false, coins } });

test("Capital: a porta da Irmandade dos Arqueiros abre o salão em Concórdia e a saída volta à rua (desktop/Android)", async ({ page }, info) => {
  const errors = await start(page, door.x, door.y, archer(0));
  const action = page.locator("#talkButton");
  const press = async (): Promise<void> => { if (info.project.name === "android") await action.tap(); else await action.click(); };
  await expect(action).toContainText("Entrar (E)");
  await press();
  await expect(action).toContainText("Sair (E)");
  await expect(page.locator("#quest")).toContainText("Irmandade dos Arqueiros");
  await expect(page.locator("#coords")).toHaveText("Interior · Concórdia");
  await page.locator("canvas#game").screenshot({ path: test.info().outputPath("irmandade-interior.png") });
  await press();
  await expect(page.locator("#coords")).not.toContainText("Interior");
  await expect(action).toContainText("Entrar (E)");
  expect(errors).toEqual([]);
});

test("Capital: o Mestre Orlan vende pacotes de junco e ferro ao Arqueiro; as compras vão para o save e a flecha de ferro entra em uso (desktop/Android)", async ({ page }, info) => {
  const errors = await start(page, master.x, master.y + 22, archer(50));
  const press = async (locator: ReturnType<typeof page.locator>): Promise<void> => { if (info.project.name === "android") await locator.tap(); else await locator.click(); };
  await press(page.getByRole("button", { name: "Conversar (E)" }));
  const dialog = page.getByRole("dialog", { name: "Mestre Orlan" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Flechas da Irmandade");
  await expect(dialog.locator("#buy-arrows-reed")).toContainText("Comprar 10 por 10 Terrania Gold");
  await expect(dialog.locator("#buy-arrows-iron")).toContainText("Comprar 10 por 30 Terrania Gold");
  await expect(dialog.locator("#use-arrows-reed")).toContainText("Em uso");
  await expect(dialog.locator("#use-arrows-iron")).toBeDisabled();
  await dialog.screenshot({ path: test.info().outputPath("irmandade-painel.png") });
  await press(dialog.locator("#buy-arrows-iron"));
  await expect(dialog.locator("#npcTradeFeedback")).toContainText("Irmandade dos Arqueiros entregou o pacote");
  await expect(dialog.locator("[data-arrow-row=iron]")).toContainText("10 de 99 na aljava");
  await expect.poll(async () => (await readSave(page)).inventory.coins).toBe(20);
  expect((await readSave(page)).inventory.quiver?.counts).toEqual({ reed: 30, iron: 10 });
  await press(dialog.locator("#buy-arrows-reed"));
  await expect.poll(async () => (await readSave(page)).inventory.coins).toBe(10);
  expect((await readSave(page)).inventory.quiver?.counts).toEqual({ reed: 40, iron: 10 });
  await expect(dialog.locator("#buy-arrows-iron")).toBeDisabled(); // 10 moedas não pagam o pacote de ferro
  await expect(dialog.locator("#use-arrows-iron")).toBeEnabled();
  await press(dialog.locator("#use-arrows-iron"));
  await expect(dialog.locator("#npcTradeFeedback")).toContainText("Flecha trocada");
  await expect(dialog.locator("#use-arrows-iron")).toContainText("Em uso");
  await expect.poll(async () => (await readSave(page)).inventory.quiver?.equipped).toBe("iron");
  expect(errors).toEqual([]);
});

test("Capital: para o Cavaleiro o Mestre Orlan só conversa, sem painel de venda (desktop/Android)", async ({ page }, info) => {
  const errors = await start(page, master.x, master.y + 22, { inventory: { gel: 0, potion: 0, questRewardClaimed: false, coins: 100 } });
  const press = async (locator: ReturnType<typeof page.locator>): Promise<void> => { if (info.project.name === "android") await locator.tap(); else await locator.click(); };
  await press(page.getByRole("button", { name: "Conversar (E)" }));
  const dialog = page.getByRole("dialog", { name: "Mestre Orlan" });
  await expect(dialog).toBeVisible(); await expect(dialog).toContainText("Mensagem 1 de 3");
  await expect(dialog.locator("#buy-arrows-reed")).toHaveCount(0);
  expect((await readSave(page)).inventory.quiver).toBeUndefined();
  expect(errors).toEqual([]);
});
