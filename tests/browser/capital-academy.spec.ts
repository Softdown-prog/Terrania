import { expect, test, type Page } from "@playwright/test";
import { CAPITAL_DOORS } from "../../src/world/center/capital/index.ts";
import { MAGE_MASTER_ID } from "../../src/npcs/center/capital/index.ts";
import { NPCS } from "../../src/world/npcs.ts";
import { experienceForLevel } from "../../src/engine/character/Experience.ts";
import { NEW_PLAYER_STATE } from "./support/returning-player.ts";

/**
 * A Academia Arcana no jogo de verdade (ADR 0074): a porta abre o salão em Concórdia; a Mestra Ilvana vende ao Mago o Cajado da Brisa por
 * 30 Terrania Gold (com o save conferido), libera a troca no nível 10 e não vende nada ao Cavaleiro.
 */
test.use({ storageState: NEW_PLAYER_STATE });
const SEED = 842136;
const door = CAPITAL_DOORS.find(d => d.id === "capital-academia-arcana")!;
const master = NPCS.find(npc => npc.id === MAGE_MASTER_ID)!;

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
type Save = { inventory: { coins?: number; staves?: { equipped: string; bought: string[] } } };
const readSave = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("terrania-origins-v1") ?? "{}") as Save);
const mage = (level: number, coins: number) => ({ heroClass: "mage", experience: experienceForLevel(level), inventory: { gel: 0, potion: 0, questRewardClaimed: false, coins } });

test("Capital: a porta da Academia Arcana abre o salão em Concórdia e a saída volta à rua (desktop/Android)", async ({ page }, info) => {
  const errors = await start(page, door.x, door.y, mage(1, 0));
  const action = page.locator("#talkButton");
  const press = async (): Promise<void> => { if (info.project.name === "android") await action.tap(); else await action.click(); };
  await expect(action).toContainText("Entrar (E)");
  await press();
  await expect(action).toContainText("Sair (E)");
  await expect(page.locator("#quest")).toContainText("Academia Arcana");
  await expect(page.locator("#coords")).toHaveText("Interior · Concórdia");
  await page.locator("canvas#game").screenshot({ path: test.info().outputPath("academia-interior.png") });
  await press();
  await expect(page.locator("#coords")).not.toContainText("Interior");
  await expect(action).toContainText("Entrar (E)");
  expect(errors).toEqual([]);
});

test("Capital: a Mestra Ilvana vende a Brisa por 30 Terrania Gold ao Mago; a compra vai para o save e a troca vale do nível 10 (desktop/Android)", async ({ page }, info) => {
  const errors = await start(page, master.x, master.y - 22, mage(10, 50));
  const press = async (locator: ReturnType<typeof page.locator>): Promise<void> => { if (info.project.name === "android") await locator.tap(); else await locator.click(); };
  await press(page.getByRole("button", { name: "Conversar (E)" }));
  const dialog = page.getByRole("dialog", { name: "Mestra Ilvana" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Academia Arcana");
  await expect(dialog.locator("#buy-staff-breeze")).toContainText("Comprar por 30 Terrania Gold");
  await expect(dialog.locator("#buy-staff-breeze")).toBeEnabled();
  await expect(dialog).toContainText("Cajado da Brisa"); await expect(dialog).toContainText("empurra o alvo para trás");
  await dialog.screenshot({ path: test.info().outputPath("academia-painel.png") });
  await press(dialog.locator("#buy-staff-breeze"));
  await expect(dialog.locator("#npcTradeFeedback")).toContainText("Cajado comprado na Academia Arcana");
  await expect(dialog.locator("#buy-staff-breeze")).toContainText("Já possui"); await expect(dialog.locator("#buy-staff-breeze")).toBeDisabled();
  await expect.poll(async () => (await readSave(page)).inventory.coins).toBe(20);
  expect((await readSave(page)).inventory.staves).toEqual({ equipped: "apprentice", bought: ["breeze"] });
  await press(dialog.getByRole("button", { name: /Fechar|×/ }).first());
  await press(page.locator("#gameMenuButton")); await press(page.locator("#inventoryButton"));
  if (info.project.name === "android") await press(page.locator("#inventoryTabEquipment"));
  await expect(page.locator("#equip-slot-staff-breeze")).toContainText("Equipar"); await expect(page.locator("#equip-slot-staff-breeze")).toBeEnabled();
  await press(page.locator("#equip-slot-staff-breeze"));
  await expect(page.locator("#equippedWeapon")).toHaveText("Cajado da Brisa"); await expect(page.locator("#equippedStaffEffect")).toContainText("empurra o alvo para trás");
  expect(errors).toEqual([]);
});

test("Capital: sem moedas o botão da Brisa fica desligado; o Cavaleiro só conversa e nada é vendido (desktop/Android)", async ({ page }, info) => {
  const errors = await start(page, master.x, master.y - 22, mage(10, 10));
  const press = async (locator: ReturnType<typeof page.locator>): Promise<void> => { if (info.project.name === "android") await locator.tap(); else await locator.click(); };
  await press(page.getByRole("button", { name: "Conversar (E)" }));
  const dialog = page.getByRole("dialog", { name: "Mestra Ilvana" });
  await expect(dialog.locator("#buy-staff-breeze")).toBeDisabled();
  expect((await readSave(page)).inventory.staves).toBeUndefined();
  expect(errors).toEqual([]);
});

test("Capital: para o Cavaleiro a Mestra só conversa, sem painel de venda (desktop/Android)", async ({ page }, info) => {
  const errors = await start(page, master.x, master.y - 22, { experience: experienceForLevel(10), inventory: { gel: 0, potion: 0, questRewardClaimed: false, coins: 100 } });
  const press = async (locator: ReturnType<typeof page.locator>): Promise<void> => { if (info.project.name === "android") await locator.tap(); else await locator.click(); };
  await press(page.getByRole("button", { name: "Conversar (E)" }));
  const dialog = page.getByRole("dialog", { name: "Mestra Ilvana" });
  await expect(dialog).toBeVisible(); await expect(dialog).toContainText("Mensagem 1 de 3");
  for (let page2 = 0; page2 < 2; page2++) await press(dialog.getByRole("button", { name: "Continuar" }));
  await expect(dialog).toContainText("A Academia é dos magos");
  await expect(dialog.locator("#buy-staff-breeze")).toHaveCount(0);
  expect((await readSave(page)).inventory.staves).toBeUndefined();
  expect(errors).toEqual([]);
});
