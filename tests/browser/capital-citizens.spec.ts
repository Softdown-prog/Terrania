import { expect, test, type Page } from "@playwright/test";
import { CAPITAL_CITIZENS } from "../../src/npcs/center/capital/index.ts";
import { CAPITAL_CITIZEN_DIALOGUES } from "../../src/npcs/center/capital/citizens/index.ts";

/**
 * Moradores que andam pelas ruas de Concórdia no jogo de verdade (ADR 0108): o herói parado ao lado do Tomé consegue conversar com ele
 * no começo da rota; passados alguns segundos de jogo o Tomé já andou para longe e o botão de conversa some. O relógio fica parado e
 * avança só quando o teste manda, para o passo do morador não depender da velocidade do computador.
 */
const SEED = 842136;
const tome = CAPITAL_CITIZENS.find(npc => npc.name === "Tomé")!;

async function start(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const time = new Date("2026-01-01T00:00:00Z");
  await page.clock.install({ time });
  await page.clock.pauseAt(new Date(time.getTime() + 1000));
  await page.addInitScript(({ seed, x, y }) => {
    localStorage.setItem("terrania-origins-v1", JSON.stringify({ mapVersion: 2, seed, x, y, hp: 100, kills: 0, defeated: [], experience: 3000 }));
    localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false }));
  }, { seed: SEED, x: tome.x, y: tome.y + 24 });
  await page.goto("/jogar/?modo=solo");
  await expect.poll(async () => { await page.clock.runFor(32); return page.locator("canvas#game").count(); }).toBe(1);
  await page.clock.runFor(64);
  return errors;
}

test("Capital: Tomé conversa no começo da rota e, uns segundos depois, já andou para longe (desktop/Android)", async ({ page }, info) => {
  const errors = await start(page);
  const talk = page.locator("#talkButton");
  const press = async (): Promise<void> => { if (info.project.name === "android") await talk.tap(); else await talk.click(); };
  await expect(talk).toBeVisible();
  await expect(talk).toContainText("Conversar (E)");
  await press();
  await page.clock.runFor(100);
  const dialog = page.getByRole("dialog", { name: "Tomé" });
  await expect(dialog).toBeVisible();
  await expect(page.locator("#npcRole")).toHaveText("Remendão");
  await expect(page.locator("#npcSpeech")).toHaveText(CAPITAL_CITIZEN_DIALOGUES[tome.id]![0]!);
  await page.locator("canvas#game").screenshot({ path: test.info().outputPath("tome-conversando.png") });
  await dialog.getByRole("button", { name: "Fechar conversa" }).click();
  await page.clock.runFor(100);
  await expect(dialog).toBeHidden();
  await page.clock.runFor(5000);
  await expect(talk).toBeHidden();
  await page.locator("canvas#game").screenshot({ path: test.info().outputPath("tome-ja-andou.png") });
  expect(errors).toEqual([]);
});
