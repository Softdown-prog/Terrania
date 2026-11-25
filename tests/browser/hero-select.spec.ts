import { expect, test } from "@playwright/test";
import { NEW_PLAYER_STATE } from "./support/returning-player.ts";

/**
 * A tela de escolha do herói no jogo de verdade (ADR 0066): o jogador novo e o "Novo mundo" escolhem Cavaleiro ou Mago; o Mago aparece
 * bloqueado ("Em breve") até estar completo; quem já tem save entra direto.
 */
// Estes testes começam do zero (o padrão dos outros é um jogador que já voltou): sem nenhum save no navegador.
test.use({ storageState: NEW_PLAYER_STATE });
const KEY = "terrania-origins-v1";
const save = (extra: Record<string, unknown> = {}) => JSON.stringify({ mapVersion: 2, seed: 842136, x: 432, y: 48, hp: 100, kills: 0, defeated: [], experience: 0, ...extra });
type Saved = { seed: number; heroClass?: string };
const readSave = (page: import("@playwright/test").Page) => page.evaluate((key) => { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as Saved : null; }, KEY);

test("jogador novo: a tela de escolha abre com os dois heróis liberados, Esc não fecha e escolher o Cavaleiro começa e salva (desktop/Android)", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false })));
  await page.goto("/jogar/?modo=solo");
  const dialog = page.getByRole("dialog", { name: "Escolha o seu herói" });
  await expect(dialog).toBeVisible();
  const knight = dialog.locator("#choose-knight"), mage = dialog.locator("#choose-mage");
  await expect(knight).toBeEnabled(); await expect(knight).toContainText("Jogar como Cavaleiro");
  await expect(mage).toBeEnabled(); await expect(mage).toContainText("Jogar como Mago");
  await expect(dialog.locator("[data-hero=mage] .hero-card-badge")).toHaveCount(0);
  await expect(dialog.locator("[data-hero=knight] canvas")).toBeVisible();
  await expect(dialog.locator("[data-hero=mage] canvas")).toBeVisible();
  await dialog.screenshot({ path: test.info().outputPath("escolha-heroi.png") });
  if (info.project.name !== "android") { await page.keyboard.press("Escape"); await expect(dialog).toBeVisible(); }
  expect(await readSave(page), "ainda sem save antes de escolher").toBeNull();
  if (info.project.name === "android") await knight.tap(); else await knight.click();
  await expect(dialog).toBeHidden();
  await expect.poll(() => readSave(page)).not.toBeNull();
  expect((await readSave(page))!.heroClass, "o Cavaleiro não ganha campo novo no save").toBeUndefined();
  await page.reload();
  await expect(page.locator("canvas#game")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Escolha o seu herói" })).toBeHidden();
  expect(errors).toEqual([]);
});

test("quem já tem save entra direto, sem a tela de escolha (desktop/Android)", async ({ page }) => {
  await page.addInitScript(([key, value]) => { localStorage.setItem(key!, value!); localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false })); }, [KEY, save()]);
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Escolha o seu herói" })).toBeHidden();
});

test("Novo mundo: depois de confirmar abre a escolha do herói, e escolher o Cavaleiro começa o mundo novo (desktop/Android)", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(([key, value]) => { if (!localStorage.getItem(key!)) localStorage.setItem(key!, value!); localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false })); }, [KEY, save()]);
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  const press = async (locator: ReturnType<typeof page.locator>): Promise<void> => { if (info.project.name === "android") await locator.tap(); else await locator.click(); };
  await press(page.getByRole("button", { name: "☰ Opções" }));
  await press(page.locator("#settingsButton"));
  await press(page.locator("#newWorld"));
  await press(page.locator("#confirmWorld"));
  const dialog = page.getByRole("dialog", { name: "Escolha o seu herói" });
  await expect(dialog).toBeVisible();
  const before = new URL(page.url()).searchParams.get("seed");
  await press(dialog.locator("#choose-knight"));
  await expect(dialog).toBeHidden();
  await expect.poll(async () => (await readSave(page))?.seed).not.toBe(842136);
  expect(before).not.toBe("842136");
  expect(errors).toEqual([]);
});

test("jogador novo escolhe o Mago: o mundo começa de Mago, com barra de mana, cajado e as roupas de Aprendiz no inventário (desktop/Android)", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false })));
  await page.goto("/jogar/?modo=solo");
  const dialog = page.getByRole("dialog", { name: "Escolha o seu herói" });
  await expect(dialog).toBeVisible();
  const press = async (locator: ReturnType<typeof page.locator>): Promise<void> => { if (info.project.name === "android") await locator.tap(); else await locator.click(); };
  await press(dialog.locator("#choose-mage"));
  await expect(dialog).toBeHidden();
  await expect.poll(async () => (await readSave(page))?.heroClass).toBe("mage");
  await expect(page.locator("#manaText")).toHaveText(/^\d+ \/ 50$/);
  await expect(page.locator("#hpText")).toHaveText("80 / 80");
  await press(page.locator("#gameMenuButton")); await press(page.locator("#inventoryButton"));
  const inventory = page.locator("#inventoryDialog");
  await expect(inventory).toBeVisible();
  await expect(page.locator("#inventoryTitle")).toHaveText("Inventário do mago");
  if (info.project.name === "android") await press(page.locator("#inventoryTabEquipment"));
  await expect(page.locator("[data-equipment-slot]")).toHaveCount(8);
  await expect(page.locator("[data-equipment-slot=weapon]")).toContainText("Cajado");
  await expect(page.locator("[data-equipment-slot=head]")).toContainText("Chapéu de Aprendiz");
  await expect(page.locator("[data-equipment-slot=shield]")).toContainText("Caderno de Feitiços");
  await expect(page.locator("#equippedWeapon")).toHaveText("Cajado de Aprendiz");
  await expect(page.locator("#equippedStaffStats")).toContainText("5 de mana");
  await expect(page.locator(".preview-eyebrow")).toHaveText("SEU MAGO");
  await expect(page.locator("#equipmentDefense")).toHaveText("Defesa 1");
  await expect(page.locator(".sword-choice")).toHaveCount(11);
  await expect(page.locator("#equip-slot-staff-apprentice")).toContainText("Equipado");
  await expect(page.locator("#equip-slot-staff-breeze")).toContainText("Bloqueado");
  await expect(page.locator("#inventoryHero")).toBeVisible();
  await page.locator(".armory-panel").screenshot({ path: test.info().outputPath("inventario-do-mago.png") });
  await page.locator("#inventoryDialog .dialog-x").click();
  await page.reload();
  await expect(page.locator("canvas#game")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Escolha o seu herói" })).toBeHidden();
  await expect(page.locator("#manaText")).toBeVisible();
  expect(errors).toEqual([]);
});

test("o Cavaleiro continua com os dez espaços, as onze espadas e a defesa no inventário (desktop/Android)", async ({ page }, info) => {
  await page.addInitScript(([key, value]) => { localStorage.setItem(key!, value!); localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false })); }, [KEY, save()]);
  await page.goto("/jogar/?modo=solo");
  const press = async (locator: ReturnType<typeof page.locator>): Promise<void> => { if (info.project.name === "android") await locator.tap(); else await locator.click(); };
  await press(page.locator("#gameMenuButton")); await press(page.locator("#inventoryButton"));
  await expect(page.locator("#inventoryTitle")).toHaveText("Inventário do cavaleiro");
  if (info.project.name === "android") await press(page.locator("#inventoryTabEquipment"));
  await expect(page.locator("[data-equipment-slot]")).toHaveCount(10);
  await expect(page.locator(".preview-eyebrow")).toHaveText("SEU CAVALEIRO");
  await expect(page.locator(".sword-choice")).toHaveCount(11);
  await expect(page.locator("#equipmentDefense")).toBeVisible();
});
