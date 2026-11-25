import { expect, test, type Page } from "@playwright/test";
import { NEW_PLAYER_STATE } from "./support/returning-player.ts";

/**
 * As roupas do Mago no jogo de verdade (ADR 0078, lote A1): o inventário do Mago mostra os oito espaços (o cajado e as sete roupas) com os nomes
 * dele, o conjunto do Aprendiz já vestido (defesa 1), e vestir ou tirar uma peça muda o desenho do Mago de verdade e fica no save. Desktop e Android.
 */
test.use({ storageState: NEW_PLAYER_STATE });
const KEY = "terrania-origins-v1";
const world = JSON.stringify({ mapVersion: 2, seed: 842136, x: 432, y: 48, hp: 150, kills: 0, defeated: [], experience: 0, heroClass: "mage", mana: 40,
  inventory: { gel: 0, potion: 0, questRewardClaimed: false } });
const prefs = JSON.stringify({ zoom: 1, effects: false, cameraMotion: false });

async function openEquipment(page: Page, android: boolean): Promise<void> {
  const press = async (locator: ReturnType<typeof page.locator>): Promise<void> => { if (android) await locator.tap(); else await locator.click(); };
  await press(page.locator("#gameMenuButton")); await press(page.locator("#inventoryButton"));
  if (android) await press(page.locator("#inventoryTabEquipment"));
  await expect(page.locator("[data-equipment-slot]").first()).toBeVisible();
}
/** Quantos pixels do desenho do Mago na prévia têm a cor dada (com uma folga pequena). */
const pixelsOf = (page: Page, rgb: [number, number, number]) => page.locator("#inventoryHero").evaluate((canvas, [r, g, b]) => {
  const el = canvas as HTMLCanvasElement, data = el.getContext("2d")!.getImageData(0, 0, el.width, el.height).data;
  let marks = 0;
  for (let i = 0; i < data.length; i += 4) if (Math.abs(data[i]! - r!) < 5 && Math.abs(data[i + 1]! - g!) < 5 && Math.abs(data[i + 2]! - b!) < 5 && data[i + 3]! > 230) marks++;
  return marks;
}, rgb);
const savedGear = (page: Page) => page.evaluate(key => (JSON.parse(localStorage.getItem(key) ?? "null") as { inventory?: { gear?: Record<string, string> } } | null)?.inventory?.gear, KEY);

test("Mago: oito espaços com as roupas de Aprendiz vestidas; tirar e vestir uma peça muda o desenho e fica no save (desktop/Android)", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  // o save semeado só vale na primeira carga: ao recarregar, vale o que o jogo salvou
  await page.addInitScript(([key, value, preferences]) => { if (localStorage.getItem(key!) === null) localStorage.setItem(key!, value!); localStorage.setItem("terrania-preferences-v1", preferences!); }, [KEY, world, prefs]);
  const android = info.project.name === "android";
  await page.setViewportSize(android ? { width: 390, height: 844 } : { width: 1200, height: 800 });
  const press = async (locator: ReturnType<typeof page.locator>): Promise<void> => { if (android) await locator.tap(); else await locator.click(); };
  await page.goto("/jogar/?modo=solo");
  await openEquipment(page, android);
  await expect(page.locator("[data-equipment-slot]")).toHaveCount(8);
  for (const [slot, label, name] of [["head", "Chapéu", "Chapéu de Aprendiz"], ["chest", "Túnica", "Túnica de Aprendiz"], ["legs", "Calça", "Calça de Aprendiz"], ["feet", "Botas", "Botas de Aprendiz"],
    ["shield", "Livro de magias", "Caderno de Feitiços"], ["ring", "Anel", "Anel de Latão"], ["neck", "Colar", "Pingente de Cristal Baço"]] as const) {
    await expect(page.locator(`[data-equipment-slot=${slot}]`)).toContainText(label); await expect(page.locator(`[data-equipment-slot=${slot}]`)).toContainText(name);
  }
  await expect(page.locator("[data-equipment-slot=weapon]")).toContainText("Cajado");
  await expect(page.locator("[data-equipment-slot=backpack]")).toHaveCount(0); await expect(page.locator("[data-equipment-slot=ammo]")).toHaveCount(0);
  await expect(page.locator("#equipmentDefense")).toHaveText("Defesa 1");
  await expect(page.locator("#equipmentBonus")).toHaveText("Mana +0% · Recarga +0% · Dano +0%");
  // cores que só a peça desenha na prévia: o brilho claro do chapéu e a fita marcadora vermelha do livro (as outras cores se repetem em olhos, cajado e manto)
  const HAT: [number, number, number] = [110, 102, 200], RIBBON: [number, number, number] = [180, 67, 90];
  await expect.poll(() => pixelsOf(page, HAT), { message: "o chapéu de Aprendiz aparece no desenho" }).toBeGreaterThan(3);
  await expect.poll(() => pixelsOf(page, RIBBON), { message: "o livro de magias aparece na mão livre" }).toBeGreaterThan(5);
  await page.locator(".armory-panel").screenshot({ path: test.info().outputPath("mago-roupas-vestido.png") });
  // tirar o chapéu: o espaço fica vazio, o chapéu some do desenho e o save guarda o resto
  await press(page.locator("[data-equipment-slot=head]"));
  await press(page.getByRole("button", { name: "Retirar Chapéu de Aprendiz" }));
  await expect(page.locator("[data-equipment-slot=head]")).toContainText("Vazio");
  await expect.poll(() => pixelsOf(page, HAT)).toBe(0);
  await expect.poll(() => savedGear(page)).toEqual({ chest: "apprentice-robe", legs: "apprentice-trousers", feet: "apprentice-boots", shield: "apprentice-notebook", ring: "brass-ring", neck: "dull-crystal-pendant" });
  // tirar o livro
  await press(page.locator("[data-equipment-slot=shield]"));
  await press(page.getByRole("button", { name: "Retirar Caderno de Feitiços" }));
  await expect.poll(() => pixelsOf(page, RIBBON)).toBe(0);
  // sem a túnica a defesa cai a 0, e vestir de volta devolve
  await press(page.locator("[data-equipment-slot=chest]"));
  await press(page.getByRole("button", { name: "Retirar Túnica de Aprendiz" }));
  await expect(page.locator("#equipmentDefense")).toHaveText("Defesa 0");
  await press(page.getByRole("button", { name: "Equipar Túnica de Aprendiz" }));
  await expect(page.locator("#equipmentDefense")).toHaveText("Defesa 1");
  // recarregar: quem tirou o chapéu e o livro continua sem eles (não volta a nascer vestido)
  await page.reload();
  await openEquipment(page, android);
  await expect(page.locator("[data-equipment-slot=head]")).toContainText("Vazio"); await expect(page.locator("[data-equipment-slot=shield]")).toContainText("Vazio");
  await expect(page.locator("[data-equipment-slot=chest]")).toContainText("Túnica de Aprendiz");
  await expect.poll(() => pixelsOf(page, HAT)).toBe(0);
  // vestir o chapéu de novo
  await press(page.locator("[data-equipment-slot=head]"));
  await press(page.getByRole("button", { name: "Equipar Chapéu de Aprendiz" }));
  await expect.poll(() => pixelsOf(page, HAT)).toBeGreaterThan(3);
  expect(errors).toEqual([]);
});
