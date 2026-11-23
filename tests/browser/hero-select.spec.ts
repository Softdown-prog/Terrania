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

test("jogador novo: a tela de escolha abre, o Mago está bloqueado, Esc não fecha e escolher o Cavaleiro começa e salva (desktop/Android)", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false })));
  await page.goto("/jogar/?modo=solo");
  const dialog = page.getByRole("dialog", { name: "Escolha o seu herói" });
  await expect(dialog).toBeVisible();
  const knight = dialog.locator("#choose-knight"), mage = dialog.locator("#choose-mage");
  await expect(knight).toBeEnabled(); await expect(knight).toContainText("Jogar como Cavaleiro");
  await expect(mage).toBeDisabled(); await expect(mage).toContainText("Em breve");
  await expect(dialog.locator("[data-hero=mage] .hero-card-badge")).toContainText("Em breve");
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
