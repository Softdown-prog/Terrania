import { expect, test, type Page } from "@playwright/test";
import { experienceForLevel } from "../../src/engine/character/Experience.ts";

/**
 * O diário de missões no jogo de verdade (ADR 0100): a aba Missões do inventário com as missões em andamento, as que dá para começar e as concluídas, o painel da tela
 * que só acompanha missão em andamento (a concluída sai dele) e o guia de direção da missão do Garrano (Eron).
 */
const SEED = 842136;
async function open(page: Page, save: Record<string, unknown>): Promise<string[]> {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(data => {
    localStorage.setItem("terrania-origins-v1", JSON.stringify(data));
    localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false }));
  }, { seed: SEED, hp: 100, kills: 0, defeated: [], x: 16, y: 16, ...save });
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  await page.waitForTimeout(500);
  return errors;
}
async function openJournal(page: Page): Promise<void> {
  await page.locator("#gameMenuButton").click();
  await page.locator("#inventoryButton").click();
  await page.locator("#inventoryTabQuests").click();
  await expect(page.locator("#questJournal")).toBeVisible();
}

test("começo do jogo: o painel mostra a clareira e o diário lista uma em andamento e duas para começar (desktop/Android)", async ({ page }) => {
  const errors = await open(page, {});
  await expect(page.locator("#quest")).toHaveText("Proteja a clareira");
  await expect(page.locator(".quest .stat-heading")).toHaveText("MISSÃO");
  await openJournal(page);
  await expect(page.locator("#questGroup-active")).toHaveText("Em andamento (1)");
  await expect(page.locator("#questGroup-available")).toHaveText("Para começar (2)");
  await expect(page.locator("#questGroup-completed")).toHaveCount(0);
  await expect(page.locator('[data-quest="clearing"]')).toContainText("derrote 5 slimes (0/5)");
  await expect(page.locator('[data-quest="warhorse"]')).toContainText("nível 15");
  await expect(page.locator('[data-quest="well"]')).toContainText("Gorrak");
  expect(errors).toEqual([]);
});

test("clareira concluída: sai do painel da tela e vai para as concluídas do diário (desktop/Android)", async ({ page }) => {
  const errors = await open(page, { trainingKills: 5, inventory: { gel: 0, potion: 2, questRewardClaimed: true } });
  await expect(page.locator("#quest")).toHaveText("Nenhuma missão em andamento");
  await expect(page.locator("#questProgress")).toContainText("Diário");
  await expect(page.locator("#quest")).not.toContainText("Clareira");
  await openJournal(page);
  await expect(page.locator("#questGroup-completed")).toHaveText("Concluídas (1)");
  await expect(page.locator('[data-quest="clearing"]')).toHaveClass(/completed/);
  await expect(page.locator("#questGroup-active")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("duas missões ao mesmo tempo: o painel mostra quantas outras há e dá para escolher qual acompanhar (desktop/Android)", async ({ page }) => {
  const errors = await open(page, { wellQuest: { heard: ["south-gorrak"], inspected: false, analyzed: false, reported: false } });
  await expect(page.locator(".quest .stat-heading")).toHaveText("MISSÃO · +1 EM ANDAMENTO");
  await expect(page.locator("#quest")).toHaveText("Proteja a clareira");
  await openJournal(page);
  await expect(page.locator("#questGroup-active")).toHaveText("Em andamento (2)");
  await page.locator('[data-quest="well"] .quest-track').click();
  await page.locator("#inventoryDialog .dialog-x").click();
  await expect(page.locator("#quest")).toHaveText("A Água Escura");
  await expect(page.locator("#questProgress")).toContainText("3 versões (1/3)");
  expect(errors).toEqual([]);
});

test("missão do Garrano em andamento: as etapas aparecem e a atual diz onde ir (desktop/Android)", async ({ page }) => {
  const errors = await open(page, {
    x: 384, y: 112, kills: 0, experience: experienceForLevel(15),
    mounts: { stableTier: 1, ridingTier: 1, quest: { id: "warhorse", step: 0, count: 0, killsAtStart: 0, gift: "Maçã Silvestre Doce" } },
  });
  await openJournal(page);
  const entry = page.locator('[data-quest="warhorse"]');
  await expect(entry).toContainText("O Garrano Fugitivo");
  await expect(entry).toContainText("garrano (o cavalo de batalha");
  await expect(entry).toContainText("marcas de cascos no chão");
  await expect(entry.locator(".step-guide")).toContainText("as marcas de cascos: a");
  await expect(entry.locator(".step-guide")).toContainText("a oeste");
  await expect(entry.locator(".step-current, .step-done, .step-todo")).toHaveCount(5);
  expect(errors).toEqual([]);
});
