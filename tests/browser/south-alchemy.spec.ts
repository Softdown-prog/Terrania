import { expect, test } from "@playwright/test";
import { NPCS } from "../../src/world/npcs.ts";
import { elixirRecipe } from "../../src/engine/character/south/alchemy/index.ts";

/**
 * Alquimia da Casa de Venenos no jogo de verdade (ADR 0030): conversar com Ixtal, preparar a Poção Maior
 * com ingredientes e moedas da bolsa salva, vê-la na bolsa e bebê-la para recuperar vida.
 */
const POTION = elixirRecipe("greater-potion");
type Save = { hp: number; inventory: { coins?: number; materials?: Record<string, number>; elixirs?: Record<string, number> } };

test("Casa de Venenos: Ixtal prepara a Poção Maior e o herói a bebe na bolsa (desktop/Android)", async ({ page }, info) => {
  const ixtal = NPCS.find(npc => npc.id === "south-ixtal")!;
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(({ x, y, coins }) => {
    localStorage.setItem("terrania-origins-v1", JSON.stringify({
      seed: 842136, x, y, hp: 30, kills: 0, defeated: [], experience: 1350,
      inventory: { gel: 0, potion: 0, questRewardClaimed: false, coins,
        materials: { "Polpa de Cacto Hidratante": 2, "Flor do Deserto": 1 } },
    }));
    localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false }));
  }, { x: ixtal.x, y: ixtal.y + 24, coins: POTION.price + 7 });
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  const press = async (locator: ReturnType<typeof page.locator>): Promise<void> => {
    if (info.project.name === "android") await locator.tap(); else await locator.click();
  };
  const read = (): Promise<Save> => page.evaluate(() => JSON.parse(localStorage.getItem("terrania-origins-v1") ?? "{}") as Save);

  await press(page.getByRole("button", { name: "Conversar (E)" }));
  const dialog = page.getByRole("dialog", { name: "Ixtal, o Destilador" });
  await expect(dialog).toBeVisible();
  const craft = dialog.locator("#craft-greater-potion");
  await expect(dialog.locator('[data-recipe="greater-potion"]')).toContainText("Poção Maior");
  await expect(dialog.locator('[data-ingredient="Polpa de Cacto Hidratante"]')).toContainText("2/2");
  await expect(craft).toBeEnabled();
  await expect(dialog.locator("#craft-antidote")).toBeDisabled();
  await press(craft);
  await expect(dialog.locator("#npcTradeFeedback")).toContainText("Ixtal preparou Poção Maior");
  const crafted = await read();
  expect(crafted.inventory.coins).toBe(7);
  expect(crafted.inventory.elixirs).toEqual({ "greater-potion": 1, antidote: 0 });
  expect(crafted.inventory.materials ?? {}).toEqual({});
  // Sem ingredientes e sem dinheiro, o botão fecha.
  await expect(craft).toBeDisabled();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.locator("#gameMenuButton").click();
  await page.locator("#inventoryButton").click();
  const bagTab = page.locator("#inventoryTabBag");
  if (await bagTab.isVisible()) await bagTab.click();
  const item = page.locator('[data-bag-item="elixir-greater-potion"]');
  await expect(item.locator(".backpack-quantity")).toHaveText("1");
  await expect(item.locator("app-item-icon")).toHaveAttribute("data-icon", "greater-potion");
  await press(item);
  await expect(page.locator("#selectedBagName")).toHaveText("Poção Maior");
  await press(page.locator(".backpack-details .primary-button"));
  await expect(page.locator("#inventoryFeedback")).toContainText("Poção Maior: Elixir bebido");
  const drunk = await read();
  expect(drunk.hp).toBeGreaterThan(30);
  expect(drunk.inventory.elixirs).toBeUndefined();
  expect(errors).toEqual([]);
});
