import { expect, test } from "@playwright/test";
import { NPCS } from "../../src/world/npcs.ts";
import { experienceForLevel } from "../../src/engine/character/Experience.ts";

/**
 * Cercado do Domador Rukh no jogo de verdade (ADR 0028): comprar o Escaravelho de Carga com moedas,
 * montar, guardar, e ver o Lagarto das Areias bloqueado sem dinheiro suficiente.
 */
test("Poço Negro: Rukh vende o Escaravelho de Carga, que se monta e se guarda no cercado (desktop/Android)", async ({ page }, info) => {
  const rukh = NPCS.find(npc => npc.id === "south-rukh")!;
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(({ x, y, xp }) => {
    localStorage.setItem("terrania-origins-v1", JSON.stringify({
      seed: 842136, x, y, hp: 100, kills: 0, defeated: [], experience: xp,
      inventory: { gel: 0, potion: 0, questRewardClaimed: false, coins: 600 },
      mounts: { stableTier: 2, ridingTier: 2 },
    }));
    localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false }));
  }, { x: rukh.x, y: rukh.y + 24, xp: experienceForLevel(40) });
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  const press = async (locator: ReturnType<typeof page.locator>): Promise<void> => {
    if (info.project.name === "android") await locator.tap(); else await locator.click();
  };
  const savedGame = (): Promise<{ inventory: { coins: number }; mounts?: { owned?: string[]; saddled?: string[]; active?: string } }> =>
    page.evaluate(() => JSON.parse(localStorage.getItem("terrania-origins-v1") ?? "{}"));
  await press(page.getByRole("button", { name: "Conversar (E)" }));
  const dialog = page.getByRole("dialog", { name: "Domador Rukh" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-mount-sale="cargo-beetle"]')).toContainText("Escaravelho de Carga");
  await expect(dialog.locator('[data-mount-sale="sand-basilisk"]')).toContainText("Lagarto das Areias");
  await expect(dialog.locator("#buy-mount-sand-basilisk")).toBeDisabled(); // 600 não pagam 1.200
  await expect(dialog.locator("#buy-mount-cargo-beetle")).toBeEnabled();
  await press(dialog.locator("#buy-mount-cargo-beetle"));
  await expect(dialog.locator("#npcTradeFeedback")).toContainText("Domador Rukh entregou a montaria");
  let save = await savedGame();
  expect(save.inventory.coins).toBe(150);
  expect(save.mounts).toMatchObject({ owned: ["cargo-beetle"], saddled: ["cargo-beetle"] });
  await press(dialog.locator("#ride-cargo-beetle"));
  await expect.poll(async () => (await savedGame()).mounts?.active).toBe("cargo-beetle");
  await press(dialog.locator("#dismount-cargo-beetle"));
  await expect.poll(async () => (await savedGame()).mounts?.active).toBeUndefined();
  save = await savedGame();
  expect(save.mounts?.owned).toEqual(["cargo-beetle"]);
  expect(errors).toEqual([]);
});
