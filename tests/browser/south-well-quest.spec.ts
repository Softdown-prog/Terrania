import { expect, test, type Page } from "@playwright/test";
import { NPCS } from "../../src/world/npcs.ts";
import { WELL_REWARD_COINS, WELL_SAMPLE_MATERIAL } from "../../src/engine/quests/south/well/state.ts";

/**
 * "A Água Escura" no jogo de verdade (ADR 0031): as três versões, o poço, a comparação de Ixtal e a
 * recompensa de Gorrak, com o progresso indo e voltando pelo save e o painel de missão acompanhando.
 */
type Save = { x: number; y: number; wellQuest?: { heard: string[]; inspected: boolean; analyzed: boolean; reported: boolean };
  inventory: { coins?: number; materials?: Record<string, number> } };
const KEY = "terrania-origins-v1";

test("Poço Negro: investigar a água escura de ponta a ponta (desktop/Android)", async ({ context }, info) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  let save: Save = { x: 0, y: 0, inventory: { coins: 10, materials: { [WELL_SAMPLE_MATERIAL]: 1 } } } as Save;
  const spot = (id: string): { x: number; y: number } => { const n = NPCS.find(x => x.id === id)!; return { x: n.x, y: n.y + 24 }; };

  /** Abre uma página nova ao lado do NPC, com o save do passo anterior, e conversa até o fim. */
  const visit = async (id: string): Promise<{ page: Page; speech: string[] }> => {
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    const start = { ...save, ...spot(id) };
    await page.addInitScript(({ key, state }) => {
      localStorage.setItem(key, JSON.stringify({ seed: 842136, hp: 100, kills: 0, defeated: [], experience: 1350, trainingKills: 5,
        inventory: { gel: 0, potion: 0, questRewardClaimed: true }, ...state }));
      localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false }));
    }, { key: KEY, state: start });
    await page.goto("/jogar/?modo=solo");
    await expect(page.locator("canvas#game")).toBeVisible();
    const talk = page.getByRole("button", { name: id.endsWith("-sign") ? "Ler (E)" : "Conversar (E)" });
    if (info.project.name === "android") await talk.tap(); else await talk.click();
    const speech: string[] = [];
    for (let i = 0; i < 12; i++) {
      speech.push(await page.locator("#npcSpeech").innerText());
      const next = page.locator("#npcNext");
      const last = (await next.innerText()).includes("Encerrar");
      const step = await page.locator("#npcStep").innerText();
      if (info.project.name === "android") await next.tap(); else await next.click();
      if (last) break;
      // Só lê a próxima página depois de a tela trocar (senão repete a fala anterior).
      await expect(page.locator("#npcStep")).not.toHaveText(step);
    }
    save = await page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? "{}") as Save, KEY);
    await page.close(); // o pagehide grava o estado final antes da próxima página
    return { page, speech };
  };

  let r = await visit("south-sylrael");
  expect(r.speech.join(" ")).toContain("Nova missão: A Água Escura");
  expect(save.wellQuest?.heard).toEqual(["south-sylrael"]);
  r = await visit("south-well-sign");
  expect(r.speech.join(" ")).toContain("Ouça primeiro as três versões");
  expect(save.wellQuest?.inspected).toBe(false);
  r = await visit("south-gorrak");
  expect(r.speech.join(" ")).toContain("rastros de lama do brejo");
  r = await visit("south-khemet");
  expect(r.speech.join(" ")).toContain("presságio");
  expect(save.wellQuest?.heard).toHaveLength(3);
  r = await visit("south-well-sign");
  expect(r.speech.join(" ")).toContain("sem reflexo, com cheiro de brejo");
  expect(save.wellQuest?.inspected).toBe(true);
  r = await visit("south-ixtal");
  expect(r.speech.join(" ")).toContain("escurecem do mesmo jeito");
  expect(save.wellQuest?.analyzed).toBe(true);
  expect(save.inventory.materials ?? {}).toEqual({});
  const coinsBefore = save.inventory.coins ?? 0;
  r = await visit("south-gorrak");
  expect(r.speech.join(" ")).toContain("Missão concluída: A Água Escura");
  expect(save.wellQuest?.reported).toBe(true);
  expect(save.inventory.coins).toBe(coinsBefore + WELL_REWARD_COINS);
  // Voltar a Gorrak não paga de novo.
  r = await visit("south-gorrak");
  expect(save.inventory.coins).toBe(coinsBefore + WELL_REWARD_COINS);
  expect(errors).toEqual([]);
});

test("painel de missão: com a clareira concluída, mostra o progresso da água escura", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem("terrania-origins-v1", JSON.stringify({ seed: 842136, x: 16, y: 16, hp: 100, kills: 0, defeated: [], experience: 0,
      trainingKills: 5, inventory: { gel: 0, potion: 0, questRewardClaimed: true },
      wellQuest: { heard: ["south-gorrak", "south-khemet"], inspected: false, analyzed: false, reported: false } }));
    localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false }));
  });
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  await expect(page.locator("body")).toContainText("A Água Escura");
  await expect(page.locator("body")).toContainText("Ouça as 3 versões: 2 / 3");
  expect(errors).toEqual([]);
});
