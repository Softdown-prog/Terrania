import { expect, test, type Page } from "@playwright/test";
import { NPCS } from "../../src/world/npcs.ts";

/**
 * Bazar das Raridades e Ossuário no jogo de verdade (ADR 0026): vender na banca certa, ver as moedas
 * entrarem e o item sair da bolsa salva; cada banca recusa o que não é dela.
 */
const RARE = "Dente Dourado de Roedor", COMMON = "Rabo de Rato";
type Save = { inventory: { coins?: number; materials?: Record<string, number> } };

async function talkTo(page: Page, id: string, android: boolean): Promise<void> {
  const npc = NPCS.find(n => n.id === id)!;
  await page.addInitScript(({ x, y, rare, common }) => {
    localStorage.setItem("terrania-origins-v1", JSON.stringify({
      seed: 842136, x, y, hp: 100, kills: 0, defeated: [], experience: 0,
      inventory: { gel: 0, potion: 0, questRewardClaimed: false, materials: { [rare]: 2, [common]: 4 } },
    }));
    localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false }));
  }, { x: npc.x, y: npc.y + 24, rare: RARE, common: COMMON });
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  const button = page.getByRole("button", { name: "Conversar (E)" });
  if (android) await button.tap(); else await button.click();
}
const savedGame = (page: Page): Promise<Save> => page.evaluate(() => JSON.parse(localStorage.getItem("terrania-origins-v1") ?? "{}"));

test("Bazar: Zinha compra o raro em moedas e não o saque comum (desktop/Android)", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const press = (l: ReturnType<typeof page.locator>) => info.project.name === "android" ? l.tap() : l.click();
  await talkTo(page, "south-zinha", info.project.name === "android");
  const dialog = page.getByRole("dialog", { name: "Zinha Dedos-de-Cobre" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(`[data-sell-one="${RARE}"]`)).toBeVisible();
  await expect(dialog.locator(`[data-sell-one="${COMMON}"]`)).toHaveCount(0);
  await press(dialog.locator(`[data-sell-one="${RARE}"]`));
  await expect(dialog.locator("#npcTradeFeedback")).toContainText("Vendeu 1 × Dente Dourado de Roedor por 1 Cripta Coin e 15 Terrania Gold");
  expect((await savedGame(page)).inventory).toMatchObject({ coins: 115, materials: { [RARE]: 1, [COMMON]: 4 } });
  await press(dialog.locator(`[data-sell-one="${RARE}"]`));
  await expect.poll(async () => (await savedGame(page)).inventory.coins).toBe(230);
  expect((await savedGame(page)).inventory.materials?.[RARE]).toBeUndefined();
  await expect(dialog.getByText("Você não tem nada que esta banca compre.")).toBeVisible();
  expect(errors).toEqual([]);
});

test("Ossuário: o Coletor Marn compra o saque comum e não o raro (desktop/Android)", async ({ page }, info) => {
  const press = (l: ReturnType<typeof page.locator>) => info.project.name === "android" ? l.tap() : l.click();
  await talkTo(page, "south-marn", info.project.name === "android");
  const dialog = page.getByRole("dialog", { name: "Coletor Marn" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(`[data-sell-one="${RARE}"]`)).toHaveCount(0);
  await expect(dialog.locator(`[data-sell-one="${COMMON}"]`)).toBeVisible();
  await press(dialog.locator(`[data-sell-all="${COMMON}"]`));
  await expect(dialog.locator("#npcTradeFeedback")).toContainText("Vendeu 4 × Rabo de Rato");
  const after = (await savedGame(page)).inventory;
  expect(after.coins).toBeGreaterThan(0);
  expect(after.coins).toBeLessThan(100);
  expect(after.materials?.[COMMON]).toBeUndefined();
  expect(after.materials?.[RARE]).toBe(2);
});
