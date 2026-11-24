import { expect, test } from "@playwright/test";
import { experienceForLevel } from "../../src/engine/character/Experience.ts";
import { NEW_PLAYER_STATE } from "./support/returning-player.ts";

/**
 * Os cajados do lote 1 no jogo de verdade (ADR 0073): o inventário do Mago lista os quatro cajados, mostra o estado de cada um (em mãos,
 * disponível, à venda, bloqueado), troca de cajado por nível, mostra o efeito, guarda a escolha no save e a barra de mana usa o custo
 * do cajado novo. Desktop e Android.
 */
// Começa sem nenhum save no navegador (o padrão dos outros testes é um jogador que já voltou): cada teste semeia o mundo que quer.
test.use({ storageState: NEW_PLAYER_STATE });
const KEY = "terrania-origins-v1";
const world = (level: number, extra: Record<string, unknown> = {}) => JSON.stringify({ mapVersion: 2, seed: 842136, x: 432, y: 48, hp: 150, kills: 0, defeated: [], experience: experienceForLevel(level), heroClass: "mage", mana: 40,
  inventory: { gel: 0, potion: 0, questRewardClaimed: false, coins: 500 }, ...extra });
const prefs = JSON.stringify({ zoom: 1, effects: false, cameraMotion: false });

async function openStaves(page: import("@playwright/test").Page, android: boolean): Promise<void> {
  const press = async (locator: ReturnType<typeof page.locator>): Promise<void> => { if (android) await locator.tap(); else await locator.click(); };
  await press(page.locator("#gameMenuButton")); await press(page.locator("#inventoryButton"));
  if (android) await press(page.locator("#inventoryTabEquipment"));
  await expect(page.locator("#equippedStaffEffect")).toBeVisible();
}

test("Mago nível 20: três cajados disponíveis, a Brisa à venda; trocar para as Marés mostra o efeito, guarda no save e sobrevive a recarregar (desktop/Android)", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  // Só semeia o save na primeira abertura: depois de recarregar, vale o que o jogo guardou (a escolha do cajado).
  await page.addInitScript(([key, value, preferences]) => { if (!localStorage.getItem(key!)) localStorage.setItem(key!, value!); localStorage.setItem("terrania-preferences-v1", preferences!); }, [KEY, world(20), prefs]);
  const android = info.project.name === "android";
  await page.setViewportSize(android ? { width: 390, height: 844 } : { width: 1200, height: 800 });
  await page.goto("/jogar/?modo=solo");
  await openStaves(page, android);
  await expect(page.locator(".staff-picker .sword-choice")).toHaveCount(4);
  await expect(page.locator("#equip-slot-staff-apprentice")).toContainText("Equipado");
  await expect(page.locator("#equip-slot-staff-breeze")).toContainText("Comprar na Academia"); await expect(page.locator("#equip-slot-staff-breeze")).toBeDisabled();
  await expect(page.locator("#equip-slot-staff-stone")).toContainText("Equipar"); await expect(page.locator("#equip-slot-staff-stone")).toBeEnabled();
  await expect(page.locator("#equip-slot-staff-tide")).toContainText("Equipar"); await expect(page.locator("#equip-slot-staff-tide")).toBeEnabled();
  await expect(page.locator("#equippedStaffEffect")).toContainText("dano simples");
  const press = async (locator: ReturnType<typeof page.locator>): Promise<void> => { if (android) await locator.tap(); else await locator.click(); };
  await press(page.locator("#equip-slot-staff-tide"));
  await expect(page.locator("#equippedWeapon")).toHaveText("Cajado das Marés");
  await expect(page.locator("#equippedStaffEffect")).toContainText("cura você em 10% do dano causado");
  await expect(page.locator("#equippedStaffStats")).toContainText("28 de mana");
  await expect(page.locator("#equip-slot-staff-tide")).toContainText("Equipado"); await expect(page.locator("#equip-slot-staff-apprentice")).toContainText("Equipar");
  await expect(page.locator("#inventoryFeedback")).toContainText("Cajado equipado");
  await page.locator(".armory-panel").screenshot({ path: test.info().outputPath("cajados-do-mago.png") });
  await expect.poll(() => page.evaluate(key => (JSON.parse(localStorage.getItem(key) ?? "null") as { inventory?: { staves?: { equipped?: string } } } | null)?.inventory?.staves?.equipped, KEY)).toBe("tide");
  await page.locator("#inventoryDialog .dialog-x").click();
  await page.reload();
  await expect(page.locator("canvas#game")).toBeVisible();
  await openStaves(page, android);
  await expect(page.locator("#equippedWeapon")).toHaveText("Cajado das Marés");
  await expect(page.locator("#equip-slot-staff-tide")).toContainText("Equipado");
  expect(errors).toEqual([]);
});

test("Mago nível 1: só o Aprendiz; os outros estão bloqueados e não trocam (desktop/Android)", async ({ page }, info) => {
  await page.addInitScript(([key, value, preferences]) => { localStorage.setItem(key!, value!); localStorage.setItem("terrania-preferences-v1", preferences!); }, [KEY, world(1, { hp: 80 }), prefs]);
  const android = info.project.name === "android";
  await page.goto("/jogar/?modo=solo");
  await openStaves(page, android);
  await expect(page.locator("#equip-slot-staff-apprentice")).toContainText("Equipado");
  for (const staff of ["breeze", "stone", "tide"]) { await expect(page.locator(`#equip-slot-staff-${staff}`)).toContainText("Bloqueado"); await expect(page.locator(`#equip-slot-staff-${staff}`)).toBeDisabled(); }
});

test("Mago com a Brisa comprada (nível 10): ela fica disponível, e trocar mostra o empurrão (desktop/Android)", async ({ page }, info) => {
  await page.addInitScript(([key, value, preferences]) => { localStorage.setItem(key!, value!); localStorage.setItem("terrania-preferences-v1", preferences!); }, [KEY, world(10, { inventory: { gel: 0, potion: 0, questRewardClaimed: false, coins: 500, staves: { equipped: "apprentice", bought: ["breeze"] } } }), prefs]);
  const android = info.project.name === "android";
  await page.goto("/jogar/?modo=solo");
  await openStaves(page, android);
  await expect(page.locator("#equip-slot-staff-breeze")).toContainText("Equipar"); await expect(page.locator("#equip-slot-staff-breeze")).toBeEnabled();
  await expect(page.locator("#equip-slot-staff-stone")).toContainText("Bloqueado");
  if (android) await page.locator("#equip-slot-staff-breeze").tap(); else await page.locator("#equip-slot-staff-breeze").click();
  await expect(page.locator("#equippedWeapon")).toHaveText("Cajado da Brisa"); await expect(page.locator("#equippedStaffEffect")).toContainText("empurra o alvo para trás");
});

test("a barra de mana usa o custo do cajado em mãos: com 20 de mana as Marés (28) avisam em vermelho e o Aprendiz (5) não (desktop/Android)", async ({ page }) => {
  await page.addInitScript(([key, value, preferences]) => { localStorage.setItem(key!, value!); localStorage.setItem("terrania-preferences-v1", preferences!); }, [KEY, world(20, { mana: 20, inventory: { gel: 0, potion: 0, questRewardClaimed: false, coins: 500, staves: { equipped: "tide", bought: [] } } }), prefs]);
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator(".mana-meter")).toHaveClass(/low/);
  await page.addInitScript(([key, value]) => { localStorage.setItem(key!, value!); }, [KEY, world(20, { mana: 20 })]);
  await page.reload();
  await expect(page.locator(".mana-meter")).not.toHaveClass(/low/);
});
