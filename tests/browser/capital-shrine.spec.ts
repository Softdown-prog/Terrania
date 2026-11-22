import { expect, test, type Page } from "@playwright/test";
import { CAPITAL_DOORS } from "../../src/world/center/capital/index.ts";
import { PRIESTESS_ID } from "../../src/npcs/center/capital/index.ts";
import { RESPAWN_POINTS } from "../../src/engine/character/center/shrine/index.ts";
import { NPCS } from "../../src/world/npcs.ts";

/**
 * O Templo da Concórdia no jogo de verdade (ADR 0064): a porta abre a nave; Irmã Maelis consagra o Templo (ou a Vila) e a escolha
 * vai para o save; o herói derrotado renasce à porta do Templo, de vida cheia, e o aviso de derrota diz onde.
 */
const SEED = 842136, T = 32;
const door = CAPITAL_DOORS.find(d => d.id === "capital-templo")!;
const priestess = NPCS.find(npc => npc.id === PRIESTESS_ID)!;
const temple = RESPAWN_POINTS["capital-temple"];

async function start(page: Page, x: number, y: number, extra: Record<string, unknown>): Promise<string[]> {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(({ seed, x, y, extra }) => {
    localStorage.setItem("terrania-origins-v1", JSON.stringify({ mapVersion: 2, seed, x, y, hp: 100, kills: 0, defeated: [], experience: 1350, ...extra }));
    localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false }));
  }, { seed: SEED, x, y, extra });
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  return errors;
}
type Save = { x: number; y: number; hp: number; respawnPoint?: string };
const readSave = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("terrania-origins-v1") ?? "{}") as Save);

test("Capital: a porta do Templo abre a nave em Concórdia e a saída volta à rua (desktop/Android)", async ({ page }, info) => {
  const errors = await start(page, door.x, door.y, {});
  const action = page.locator("#talkButton");
  const press = async (): Promise<void> => { if (info.project.name === "android") await action.tap(); else await action.click(); };
  await expect(action).toContainText("Entrar (E)");
  await press();
  await expect(action).toContainText("Sair (E)");
  await expect(page.locator("#quest")).toContainText("Templo da Concórdia");
  await expect(page.locator("#coords")).toHaveText("Interior · Concórdia");
  await page.locator("canvas#game").screenshot({ path: test.info().outputPath("templo-interior.png") });
  await press();
  await expect(page.locator("#coords")).not.toContainText("Interior");
  expect(errors).toEqual([]);
});

test("Capital: Irmã Maelis consagra o Templo e a escolha vai para o save; voltar à Vila também vale (desktop/Android)", async ({ page }, info) => {
  const errors = await start(page, priestess.x, priestess.y + 24, {});
  const press = async (locator: ReturnType<typeof page.locator>): Promise<void> => { if (info.project.name === "android") await locator.tap(); else await locator.click(); };
  await press(page.getByRole("button", { name: "Conversar (E)" }));
  const dialog = page.getByRole("dialog", { name: "Irmã Maelis" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("#shrinePlace")).toContainText("Vila da Travessia");
  await expect(dialog.locator("#shrine-village")).toBeDisabled();
  await dialog.screenshot({ path: test.info().outputPath("templo-painel.png") });
  await press(dialog.locator("#shrine-temple"));
  await expect(dialog.locator("#npcTradeFeedback")).toContainText("Irmã Maelis consagrou o Templo da Concórdia");
  await expect(dialog.locator("#shrinePlace")).toContainText("Templo da Concórdia");
  await expect(dialog.locator("#shrine-temple")).toBeDisabled();
  expect((await readSave(page)).respawnPoint).toBe("capital-temple");
  await press(dialog.locator("#shrine-village"));
  await expect(dialog.locator("#npcTradeFeedback")).toContainText("retorno à Vila da Travessia");
  expect((await readSave(page)).respawnPoint, "voltar à Vila tira o campo do save").toBeUndefined();
  expect(errors).toEqual([]);
});

test("Capital: o herói derrotado renasce à porta do Templo, de vida cheia, e o aviso diz onde (desktop/Android)", async ({ page }, info) => {
  const errors = await start(page, 16, 16, { hp: 0, awaitingRespawn: true, respawnPoint: "capital-temple" });
  const press = async (locator: ReturnType<typeof page.locator>): Promise<void> => { if (info.project.name === "android") await locator.tap(); else await locator.click(); };
  const defeat = page.getByRole("dialog", { name: "Você foi derrotado" });
  await expect(defeat).toBeVisible();
  await expect(defeat.locator("#defeatPlace")).toContainText("Você renasce em Templo da Concórdia com a vida cheia");
  await press(defeat.getByRole("button", { name: "Renascer no Templo" }));
  await expect(defeat).toBeHidden();
  await expect(page.locator("#coords")).toHaveText(`X ${Math.floor(temple.x / T)} · Y ${Math.floor(temple.y / T)}`);
  const save = await readSave(page);
  expect(save.hp).toBeGreaterThan(0);
  expect(Math.abs(save.x - temple.x)).toBeLessThan(T); expect(Math.abs(save.y - temple.y)).toBeLessThan(T);
  expect(errors).toEqual([]);
});
