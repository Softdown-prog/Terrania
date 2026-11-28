import { expect, test, type Page } from "@playwright/test";
import { NEW_PLAYER_STATE } from "./support/returning-player.ts";

/**
 * As roupas do Arqueiro no jogo de verdade (ADR 0123, lote A6a): o inventário do Arqueiro mostra o conjunto Couro Cru já vestido nos sete espaços (defesa 3),
 * tirar e vestir uma peça muda a defesa e fica no save (quem tirou tudo não volta a nascer vestido), e o Arqueiro não vê as peças do Cavaleiro nem do Mago.
 */
test.use({ storageState: NEW_PLAYER_STATE });
const KEY = "terrania-origins-v1";
const world = JSON.stringify({ mapVersion: 2, seed: 842136, x: 432, y: 48, hp: 150, kills: 0, defeated: [], experience: 0, heroClass: "archer", inventory: { gel: 0, potion: 0, questRewardClaimed: false } });
const prefs = JSON.stringify({ zoom: 1, effects: false, cameraMotion: false });
const savedGear = (page: Page) => page.evaluate(key => (JSON.parse(localStorage.getItem(key) ?? "null") as { inventory?: { gear?: Record<string, string> } } | null)?.inventory?.gear, KEY);

test("Arqueiro: o Couro Cru vem vestido (defesa 3); tirar e vestir peças muda a defesa, fica no save e o couro não aparece para outras vocações (desktop/Android)", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(([key, value, preferences]) => { if (localStorage.getItem(key!) === null) localStorage.setItem(key!, value!); localStorage.setItem("terrania-preferences-v1", preferences!); }, [KEY, world, prefs]);
  const android = info.project.name === "android";
  await page.setViewportSize(android ? { width: 390, height: 844 } : { width: 1200, height: 800 });
  const press = async (locator: ReturnType<typeof page.locator>): Promise<void> => { if (android) await locator.tap(); else await locator.click(); };
  const open = async (): Promise<void> => {
    await press(page.locator("#gameMenuButton")); await press(page.locator("#inventoryButton"));
    if (android) await press(page.locator("#inventoryTabEquipment"));
    await expect(page.locator("[data-equipment-slot]").first()).toBeVisible();
  };
  await page.goto("/jogar/?modo=solo");
  await open();
  for (const [slot, label, name, icon] of [["head", "Capuz", "Capuz de Couro Cru", "archer-hood"], ["chest", "Gibão", "Gibão de Couro Cru", "archer-jerkin"], ["legs", "Calça", "Calça de Couro Cru", "archer-trousers"],
    ["feet", "Botas", "Botas de Couro Cru", "archer-boots"], ["shield", "Luvas", "Luvas de Couro Cru", "archer-gloves"], ["ring", "Anel", "Anel de Chifre", "ring"], ["neck", "Colar", "Colar de Dente", "pendant"]] as const) {
    await expect(page.locator(`[data-equipment-slot=${slot}]`)).toContainText(label); await expect(page.locator(`[data-equipment-slot=${slot}]`)).toContainText(name);
    await expect(page.locator(`[data-equipment-slot=${slot}] app-item-icon`)).toHaveAttribute("data-icon", icon);
  }
  await expect(page.locator("#equipmentDefense")).toHaveText("Defesa 3");
  await page.locator(".armory-panel").screenshot({ path: test.info().outputPath("arqueiro-roupas-vestido.png") });
  // o painel de uma peça mostra só as do Arqueiro: no espaço da cabeça, o capuz dele (já vestido) e nada do Cavaleiro nem do Mago
  await press(page.locator("[data-equipment-slot=head]"));
  await expect(page.getByRole("button", { name: "Retirar Capuz de Couro Cru" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Elmo de trilha|Chapéu de Aprendiz/ })).toHaveCount(0);
  // tirar o capuz: o espaço fica vazio, a defesa cai e o save guarda o resto
  await press(page.getByRole("button", { name: "Retirar Capuz de Couro Cru" }));
  await expect(page.locator("[data-equipment-slot=head]")).toContainText("Vazio");
  await expect(page.locator("#equipmentDefense")).toHaveText("Defesa 2");
  await expect.poll(() => savedGear(page)).toEqual({ chest: "leather-jerkin", legs: "leather-trousers", feet: "leather-boots", shield: "leather-gloves", ring: "horn-ring", neck: "tooth-necklace" });
  // recarregar: o que foi tirado continua tirado
  await page.locator("#inventoryDialog .dialog-x").click();
  await page.reload();
  await expect(page.locator("canvas#game")).toBeVisible();
  await open();
  await expect(page.locator("[data-equipment-slot=head]")).toContainText("Vazio"); await expect(page.locator("#equipmentDefense")).toHaveText("Defesa 2");
  // vestir de novo
  await press(page.locator("[data-equipment-slot=head]"));
  await press(page.getByRole("button", { name: "Equipar Capuz de Couro Cru" }));
  await expect(page.locator("[data-equipment-slot=head]")).toContainText("Capuz de Couro Cru"); await expect(page.locator("#equipmentDefense")).toHaveText("Defesa 3");
  await expect.poll(async () => (await savedGear(page))?.head).toBe("leather-hood");
  expect(errors).toEqual([]);
});
