import { expect, test, type Page } from "@playwright/test";

/**
 * O inventário do Arqueiro no jogo de verdade (ADR 0113): ainda bloqueado na tela de escolha, mas um mundo de Arqueiro (por um save) já mostra os nove
 * espaços com os nomes dele, o Arco de Caça no lugar da espada e a aljava com as 30 flechas de junco, sem o painel de cajados nem o de espadas.
 */
const KEY = "terrania-origins-v1";
const save = (extra: Record<string, unknown> = {}) => JSON.stringify({ mapVersion: 2, seed: 842136, x: 432, y: 48, hp: 85, kills: 0, defeated: [], experience: 0, heroClass: "archer", ...extra });

async function start(page: Page, extra: Record<string, unknown> = {}): Promise<string[]> {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(([key, value]) => { localStorage.setItem(key!, value!); localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false })); }, [KEY, save(extra)]);
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  return errors;
}

test("Arqueiro: o inventário tem nove espaços com nomes próprios, o Arco de Caça e a aljava com 30 flechas (desktop/Android)", async ({ page }, info) => {
  const errors = await start(page);
  const press = async (locator: ReturnType<typeof page.locator>): Promise<void> => { if (info.project.name === "android") await locator.tap(); else await locator.click(); };
  await expect(page.locator("#hpText")).toHaveText("85 / 85");
  await expect(page.locator("#manaText")).toHaveCount(0);
  await press(page.locator("#gameMenuButton")); await press(page.locator("#inventoryButton"));
  await expect(page.locator("#inventoryDialog")).toBeVisible();
  await expect(page.locator("#inventoryTitle")).toHaveText("Inventário do arqueiro");
  if (info.project.name === "android") await press(page.locator("#inventoryTabEquipment"));
  await expect(page.locator("[data-equipment-slot]")).toHaveCount(9);
  await expect(page.locator(".equipment-grid")).toHaveAttribute("aria-label", "Nove espaços de equipamento do arqueiro");
  for (const [slot, label] of [["head", "Capuz"], ["neck", "Colar"], ["ring", "Anel"], ["chest", "Gibão"], ["weapon", "Arco"], ["shield", "Luvas"], ["legs", "Calça"], ["ammo", "Flechas"], ["feet", "Botas"]] as const)
    await expect(page.locator(`[data-equipment-slot=${slot}] strong`)).toHaveText(label);
  await expect(page.locator("[data-equipment-slot=backpack]")).toHaveCount(0);
  await expect(page.locator("[data-equipment-slot=weapon] small")).toHaveText("Arco de Caça");
  await expect(page.locator("[data-equipment-slot=ammo] small")).toHaveText("Flecha de Junco × 30");
  await expect(page.locator(".preview-eyebrow")).toHaveText("SEU ARQUEIRO");
  await expect(page.locator("[data-equipment-slot=weapon] app-item-icon")).toHaveAttribute("data-icon", "bow-hunting");
  await expect(page.locator("[data-equipment-slot=ammo] app-item-icon")).toHaveAttribute("data-icon", "arrows");
  // o espaço do arco abre o painel do arco, não o de cajados nem o de espadas
  await press(page.locator("[data-equipment-slot=weapon]"));
  await expect(page.locator("#selectedSlotTitle")).toContainText("Arco");
  await expect(page.locator("#equippedWeapon")).toHaveText("Arco de Caça");
  await expect(page.locator("#equippedBowStats")).toHaveText("8 de dano · 0.8 s entre tiros · 1 flecha por tiro · alcance de 7 tiles");
  await expect(page.locator(".bow-picker .sword-choice")).toHaveCount(11);
  await expect(page.locator("#equip-slot-bow-hunting")).toContainText("Equipado");
  await expect(page.locator("#equippedStaffStats")).toHaveCount(0);
  await expect(page.locator("[data-sword-id]")).toHaveCount(0);
  await page.locator(".armory-panel").screenshot({ path: test.info().outputPath("inventario-do-arqueiro.png") });
  // o espaço das flechas mostra a aljava
  await press(page.locator("[data-equipment-slot=ammo]"));
  await expect(page.locator("#equippedAmmo")).toHaveText("30 flechas na aljava");
  await expect(page.locator(".quiver-row")).toHaveText(["Flecha de Junco · 30 de 99", "Flecha de Ferro · 0 de 99"]);
  await expect(page.locator("#quiverNote")).toContainText("Cada tiro gasta uma flecha");
  await page.locator("#inventoryDialog .dialog-x").click();
  expect(errors).toEqual([]);
});

test("Arqueiro: a aljava vai ao save como foi: com 7 flechas mostra 7, e vazia mostra aljava vazia (desktop/Android)", async ({ page }, info) => {
  const errors = await start(page, { inventory: { gel: 0, potion: 0, questRewardClaimed: false, quiver: { equipped: "reed", counts: { reed: 7 } } } });
  const press = async (locator: ReturnType<typeof page.locator>): Promise<void> => { if (info.project.name === "android") await locator.tap(); else await locator.click(); };
  await press(page.locator("#gameMenuButton")); await press(page.locator("#inventoryButton"));
  if (info.project.name === "android") await press(page.locator("#inventoryTabEquipment"));
  await expect(page.locator("[data-equipment-slot=ammo] small")).toHaveText("Flecha de Junco × 7");
  await press(page.locator("[data-equipment-slot=ammo]"));
  await expect(page.locator("#equippedAmmo")).toHaveText("7 flechas na aljava");
  await page.locator("#inventoryDialog .dialog-x").click();
  expect(errors).toEqual([]);
});

test("Arqueiro: sem nenhuma flecha o espaço fica vazio e o painel diz aljava vazia (desktop/Android)", async ({ page }, info) => {
  const errors = await start(page, { inventory: { gel: 0, potion: 0, questRewardClaimed: false, quiver: { equipped: "reed", counts: { reed: 0 } } } });
  const press = async (locator: ReturnType<typeof page.locator>): Promise<void> => { if (info.project.name === "android") await locator.tap(); else await locator.click(); };
  await press(page.locator("#gameMenuButton")); await press(page.locator("#inventoryButton"));
  if (info.project.name === "android") await press(page.locator("#inventoryTabEquipment"));
  await expect(page.locator("[data-equipment-slot=ammo] small")).toHaveText("Vazio");
  await press(page.locator("[data-equipment-slot=ammo]"));
  await expect(page.locator("#equippedAmmo")).toHaveText("Aljava vazia");
  await expect(page.locator(".quiver-row")).toHaveText(["Flecha de Junco · 0 de 99", "Flecha de Ferro · 0 de 99"]);
  await page.locator("#inventoryDialog .dialog-x").click();
  expect(errors).toEqual([]);
});
