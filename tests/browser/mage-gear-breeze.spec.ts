import { expect, test, type Page } from "@playwright/test";
import { NEW_PLAYER_STATE } from "./support/returning-player.ts";

/**
 * O conjunto da Brisa no jogo de verdade (ADR 0080, lote B1): as peças pedem o nível 10 (abaixo disso a tela diz o nível e não deixa vestir, e a mochila nem as
 * lista); no nível 10 elas aparecem na mochila com o ícone nas cores da Brisa, vestir muda o desenho do Mago de verdade, o inventário mostra os bônus e tudo
 * fica no save. Desktop e Android.
 */
test.use({ storageState: NEW_PLAYER_STATE });
const KEY = "terrania-origins-v1";
const save = (experience: number) => JSON.stringify({ mapVersion: 2, seed: 842136, x: 432, y: 48, hp: 150, kills: 0, defeated: [], experience, heroClass: "mage", mana: 40,
  inventory: { gel: 0, potion: 0, questRewardClaimed: false } });
const LEVEL_1 = save(0), LEVEL_10 = save(1350);
const prefs = JSON.stringify({ zoom: 1, effects: false, cameraMotion: false });

async function setup(page: Page, world: string, android: boolean): Promise<(locator: ReturnType<Page["locator"]>) => Promise<void>> {
  // o save semeado só vale na primeira carga: ao recarregar, vale o que o jogo salvou
  await page.addInitScript(([key, value, preferences]) => { if (localStorage.getItem(key!) === null) localStorage.setItem(key!, value!); localStorage.setItem("terrania-preferences-v1", preferences!); }, [KEY, world, prefs]);
  await page.setViewportSize(android ? { width: 390, height: 844 } : { width: 1200, height: 800 });
  return async locator => { if (android) await locator.tap(); else await locator.click(); };
}
async function openEquipment(page: Page, press: (locator: ReturnType<Page["locator"]>) => Promise<void>, android: boolean): Promise<void> {
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

test("Brisa: abaixo do nível 10 as peças ficam bloqueadas (a tela diz o nível) e nem entram na mochila (desktop/Android)", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const android = info.project.name === "android";
  const press = await setup(page, LEVEL_1, android);
  await page.goto("/jogar/?modo=solo");
  await openEquipment(page, press, android);
  await press(page.locator("[data-equipment-slot=head]"));
  await expect(page.locator("[data-gear-locked=breeze-hat]")).toContainText("Bloqueada: exige o nível 10");
  await expect(page.getByRole("button", { name: "Equipar Chapéu de Penas" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Retirar Chapéu de Aprendiz" })).toBeVisible();
  await expect(page.locator("[data-equipment-slot=head]")).toContainText("Chapéu de Aprendiz");
  if (android) await press(page.locator("#inventoryTabBag"));
  await expect(page.locator("[data-bag-item^=gear-breeze]")).toHaveCount(0);
  await expect.poll(() => savedGear(page)).toBeUndefined();
  expect(errors).toEqual([]);
});

test("Brisa: no nível 10 as peças aparecem na mochila com as cores da Brisa, vestir muda o desenho, mostra os bônus e fica no save (desktop/Android)", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const android = info.project.name === "android";
  const press = await setup(page, LEVEL_10, android);
  await page.goto("/jogar/?modo=solo");
  await openEquipment(page, press, android);
  await expect(page.locator("#equipmentBonus")).toHaveText("Mana +0% · Recarga +0% · Dano +0%");
  // a mochila lista as sete peças da Brisa, e o ícone vem tingido (a mesma silhueta, outras cores)
  if (android) await press(page.locator("#inventoryTabBag"));
  await expect(page.locator("[data-bag-item^=gear-breeze]")).toHaveCount(7);
  const icon = page.locator("[data-bag-item=gear-breeze-hat] app-item-icon");
  await expect(icon).toHaveAttribute("data-icon", "mage-hat"); await expect(icon).toHaveAttribute("data-set", "breeze");
  await expect.poll(() => icon.evaluate(el => getComputedStyle(el.querySelector("[data-fill=main]")!).fill)).toBe("rgb(107, 188, 210)");
  await expect(page.locator("[data-bag-item=gear-breeze-ring] app-item-icon")).toHaveAttribute("data-icon", "ring");
  if (android) await press(page.locator("#inventoryTabEquipment"));
  // cores que só a Brisa desenha na prévia: o brilho do chapéu e a fita do livro (as outras se repetem em olhos, cajado e manto)
  const SHEEN: [number, number, number] = [239, 255, 253], RIBBON: [number, number, number] = [111, 209, 189];
  const APPRENTICE_RIBBON: [number, number, number] = [180, 67, 90];
  await expect.poll(() => pixelsOf(page, APPRENTICE_RIBBON)).toBeGreaterThan(5);
  await expect.poll(() => pixelsOf(page, RIBBON)).toBe(0);
  const pieces: [string, string, string][] = [["head", "Chapéu de Penas", "Chapéu de Aprendiz"], ["chest", "Túnica da Brisa", "Túnica de Aprendiz"], ["legs", "Calça do Vento Leve", "Calça de Aprendiz"], ["feet", "Botas de Sopro", "Botas de Aprendiz"],
    ["shield", "Compêndio das Brisas", "Caderno de Feitiços"], ["ring", "Anel do Sopro", "Anel de Latão"], ["neck", "Colar de Pena e Vidro", "Pingente de Cristal Baço"]];
  for (const [slot, name] of pieces) {
    await press(page.locator(`[data-equipment-slot=${slot}]`));
    await expect(page.locator(`[data-gear-locked]`)).toHaveCount(0);
    await press(page.getByRole("button", { name: `Equipar ${name}` }));
    await expect(page.locator(`[data-equipment-slot=${slot}]`)).toContainText(name);
  }
  await expect(page.locator("#equipmentDefense")).toHaveText("Defesa 2");
  await expect(page.locator("#equipmentBonus")).toHaveText("Mana +2% · Recarga +2% · Dano +1%");
  await expect.poll(() => pixelsOf(page, SHEEN), { message: "o chapéu da Brisa aparece no desenho" }).toBeGreaterThan(3);
  await expect.poll(() => pixelsOf(page, RIBBON), { message: "o livro da Brisa aparece na mão livre" }).toBeGreaterThan(5);
  await expect.poll(() => pixelsOf(page, APPRENTICE_RIBBON), { message: "o livro do Aprendiz saiu" }).toBe(0);
  // o ícone do espaço também leva as cores da Brisa
  await expect(page.locator("[data-equipment-slot=head] app-item-icon")).toHaveAttribute("data-set", "breeze");
  await page.locator(".armory-panel").screenshot({ path: test.info().outputPath("mago-roupas-brisa.png") });
  await expect.poll(() => savedGear(page)).toEqual({ head: "breeze-hat", chest: "breeze-robe", legs: "breeze-trousers", feet: "breeze-boots", shield: "breeze-tome", ring: "breeze-ring", neck: "breeze-necklace" });
  // recarregar: o conjunto continua vestido
  await page.reload();
  await openEquipment(page, press, android);
  await expect(page.locator("[data-equipment-slot=head]")).toContainText("Chapéu de Penas");
  await expect(page.locator("#equipmentBonus")).toHaveText("Mana +2% · Recarga +2% · Dano +1%");
  await expect.poll(() => pixelsOf(page, SHEEN)).toBeGreaterThan(3);
  // voltar ao Aprendiz num espaço
  await press(page.locator("[data-equipment-slot=head]"));
  await press(page.getByRole("button", { name: "Equipar Chapéu de Aprendiz" }));
  await expect(page.locator("#equipmentBonus")).toHaveText("Mana +0% · Recarga +2% · Dano +1%");
  await expect.poll(() => pixelsOf(page, SHEEN)).toBe(0);
  expect(errors).toEqual([]);
});
