import { expect, test, type Page } from "@playwright/test";
import { experienceForLevel } from "../../src/engine/character/Experience.ts";
import { NEW_PLAYER_STATE } from "./support/returning-player.ts";

/**
 * Os arcos do Arqueiro no jogo de verdade (ADR 0120, lote A4a): o inventário lista os quatro arcos; no nível 15 o Arco de Chifre e o Longo de Teixo
 * ficam disponíveis e o de Osso (nível 20) bloqueado; trocar de arco muda o nome, os números, o ícone do espaço e o save, e recarregar mantém.
 */
test.use({ storageState: NEW_PLAYER_STATE });
const KEY = "terrania-origins-v1";
const save = (level: number) => JSON.stringify({ mapVersion: 2, seed: 842136, x: 432, y: 48, hp: 150, kills: 0, defeated: [], experience: experienceForLevel(level), heroClass: "archer" });
type Saved = { inventory?: { bows?: { equipped: string } } };
const readSave = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? "{}") as Saved, KEY);

test("Arqueiro nível 15: o inventário mostra os onze arcos, troca para o Longo de Teixo e o save guarda (desktop/Android)", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(([key, value]) => { if (!localStorage.getItem(key!)) localStorage.setItem(key!, value!); localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false })); }, [KEY, save(15)]);
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  const press = async (locator: ReturnType<typeof page.locator>): Promise<void> => { if (info.project.name === "android") await locator.tap(); else await locator.click(); };
  await press(page.locator("#gameMenuButton")); await press(page.locator("#inventoryButton"));
  if (info.project.name === "android") await press(page.locator("#inventoryTabEquipment"));
  await press(page.locator("[data-equipment-slot=weapon]"));
  await expect(page.locator(".bow-picker .sword-choice")).toHaveCount(11);
  await expect(page.locator("#equippedWeapon")).toHaveText("Arco de Caça");
  await expect(page.locator("#equip-slot-bow-hunting")).toContainText("Equipado");
  await expect(page.locator("#equip-slot-bow-horn")).toContainText("Equipar"); await expect(page.locator("#equip-slot-bow-horn")).toBeEnabled();
  await expect(page.locator("#equip-slot-bow-yew")).toContainText("Equipar"); await expect(page.locator("#equip-slot-bow-yew")).toBeEnabled();
  await expect(page.locator("#equip-slot-bow-bone")).toContainText("Bloqueado"); await expect(page.locator("#equip-slot-bow-bone")).toBeDisabled();
  await expect(page.locator("#equip-slot-bow-bone")).toContainText("Nível 20");
  await expect(page.locator("#equip-slot-bow-boreal")).toContainText("Nível 60"); await expect(page.locator("#equip-slot-bow-ember")).toBeDisabled();
  await expect(page.locator("#equip-slot-bow-yew app-item-icon")).toHaveAttribute("data-icon", "bow-yew");
  await press(page.locator("#equip-slot-bow-yew"));
  await expect(page.locator("#inventoryFeedback")).toContainText("Arco equipado");
  await expect(page.locator("#equippedWeapon")).toHaveText("Arco Longo de Teixo");
  await expect(page.locator("#equippedBowStats")).toContainText("21 de dano · 0.98 s entre tiros");
  await expect(page.locator("#equip-slot-bow-yew")).toContainText("Equipado"); await expect(page.locator("#equip-slot-bow-hunting")).toContainText("Equipar");
  await expect(page.locator("[data-equipment-slot=weapon] small")).toHaveText("Arco Longo de Teixo");
  await expect(page.locator("[data-equipment-slot=weapon] app-item-icon")).toHaveAttribute("data-icon", "bow-yew");
  await expect.poll(async () => (await readSave(page)).inventory?.bows?.equipped).toBe("yew");
  await page.locator(".armory-panel").screenshot({ path: test.info().outputPath("arcos-do-arqueiro.png") });
  await page.locator("#inventoryDialog .dialog-x").click();
  await page.reload();
  await expect(page.locator("canvas#game")).toBeVisible();
  await press(page.locator("#gameMenuButton")); await press(page.locator("#inventoryButton"));
  if (info.project.name === "android") await press(page.locator("#inventoryTabEquipment"));
  await expect(page.locator("[data-equipment-slot=weapon] small")).toHaveText("Arco Longo de Teixo");
  expect(errors).toEqual([]);
});

test("Arqueiro nível 1: só o Arco de Caça está disponível e os outros dez ficam bloqueados (desktop/Android)", async ({ page }, info) => {
  await page.addInitScript(([key, value]) => { if (!localStorage.getItem(key!)) localStorage.setItem(key!, value!); localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false })); }, [KEY, save(1)]);
  await page.goto("/jogar/?modo=solo");
  const press = async (locator: ReturnType<typeof page.locator>): Promise<void> => { if (info.project.name === "android") await locator.tap(); else await locator.click(); };
  await press(page.locator("#gameMenuButton")); await press(page.locator("#inventoryButton"));
  if (info.project.name === "android") await press(page.locator("#inventoryTabEquipment"));
  await press(page.locator("[data-equipment-slot=weapon]"));
  for (const id of ["horn", "yew", "bone", "ember", "thorn", "boreal", "sun", "moon", "storm", "astral"]) { await expect(page.locator(`#equip-slot-bow-${id}`)).toContainText("Bloqueado"); await expect(page.locator(`#equip-slot-bow-${id}`)).toBeDisabled(); }
  await expect(page.locator("#equip-slot-bow-hunting")).toContainText("Equipado");
});
