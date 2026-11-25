import { expect, test, type Page } from "@playwright/test";
import { CaveRoom } from "../../src/engine/rooms/CaveRoom.ts";
import { TILE_SIZE } from "../../src/world/terrain.ts";
import { caveEntranceInCell } from "../../src/world/caves.ts";
import { NEW_PLAYER_STATE } from "./support/returning-player.ts";

/**
 * Relato do dono: o Mago entrou na caverna perto da cidade e a magia não ferrava os slimes (a caverna só entregava o alvo do golpe no quadro do pedido,
 * e a magia sai depois do preparo). Aqui o jogo inteiro, no navegador: o Mago entra na caverna de treino, segue um caminho calculado sobre o mapa real
 * da caverna até perto de um slime, aperta ATACAR (Espaço) e o derrota com a magia; a vitória fica no save.
 */
test.use({ storageState: NEW_PLAYER_STATE });
const KEY = "terrania-origins-v1", SEED = 842136;
const KEYS: Record<string, string> = { "1,0": "d", "-1,0": "a", "0,1": "s", "0,-1": "w" };

/** O caminho em tiles (de um em um, só em linha reta) da chegada na caverna até um tile a 100 px do slime 5, calculado sobre o mapa real. */
function pathToSlime(entrance: NonNullable<ReturnType<typeof caveEntranceInCell>>): Array<[number, number]> {
  const room = new CaveRoom(entrance), mob = room.monsters.get(entrance.id + ":floor:1:slime:5")!;
  const tile = (v: number): number => Math.floor(v / TILE_SIZE), center = (t: number): number => (t + 0.5) * TILE_SIZE;
  // andar só por tiles em que o corpo cabe de verdade: o centro e os quatro cantos de meio tile
  const open = (tx: number, ty: number): boolean => [[0, 0], [-10, 0], [10, 0], [0, -10], [0, 10]].every(([dx, dy]) => room.collision.canMove(center(tx) + dx!, center(ty) + dy!));
  const start: [number, number] = [tile(room.player.x), tile(room.player.y)], seen = new Map<string, string | null>([[start.join(), null]]), queue = [start];
  for (let head = 0; head < queue.length; head++) {
    const [x, y] = queue[head]!;
    if (Math.hypot(center(x) - mob.x, center(y) - mob.y) <= 100) {
      const path: Array<[number, number]> = []; for (let at: string | null | undefined = [x, y].join(); at; at = seen.get(at)) path.unshift(at.split(",").map(Number) as [number, number]);
      return path;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const next: [number, number] = [x + dx, y + dy];
      if (!seen.has(next.join()) && open(next[0], next[1])) { seen.set(next.join(), [x, y].join()); queue.push(next); }
    }
  }
  throw new Error("sem caminho até o slime");
}

async function where(page: Page): Promise<[number, number]> {
  const text = (await page.locator("#coords").textContent()) ?? "", match = /X\s+(\d+)\s+·\s+Y\s+(\d+)/.exec(text);
  return match ? [Number(match[1]), Number(match[2])] : [-1, -1];
}

test("o Mago entra na caverna de treino, chega perto de um slime, aperta ATACAR e o derrota com a magia (desktop/Android)", async ({ page }, info) => {
  test.setTimeout(150_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const entrance = caveEntranceInCell(0, 0, SEED)!, path = pathToSlime(entrance);
  await page.addInitScript(([key, value, preferences]) => { localStorage.setItem(key!, value!); localStorage.setItem("terrania-preferences-v1", preferences!); },
    [KEY, JSON.stringify({ mapVersion: 2, seed: SEED, x: entrance.x, y: entrance.y, hp: 150, kills: 0, defeated: [], experience: 0, heroClass: "mage", inventory: { gel: 0, potion: 0, questRewardClaimed: false, coins: 0 } }),
      JSON.stringify({ zoom: 1, effects: false, cameraMotion: false })]);
  await page.setViewportSize(info.project.name === "android" ? { width: 390, height: 844 } : { width: 1200, height: 800 });
  await page.goto("/jogar/?modo=solo");
  const enter = page.locator("#talkButton");
  await expect(enter).toContainText("Entrar (E)");
  if (info.project.name === "android") await enter.tap(); else await enter.click();
  await expect(page.locator("#coords")).toContainText("Subsolo");
  await page.locator("canvas#game").focus();
  // segue o caminho tile a tile, conferindo as coordenadas da tela
  for (const [index, [tx, ty]] of path.slice(1).entries()) {
    const [fx, fy] = path[index]!, key = KEYS[`${tx - fx},${ty - fy}`]!;
    await page.keyboard.down(key);
    try { await expect.poll(() => where(page), { timeout: 4000, intervals: [30] }).toEqual([tx, ty]); } finally { await page.keyboard.up(key); }
  }
  const kills = (): Promise<number> => page.evaluate(key => (JSON.parse(localStorage.getItem(key) ?? "{}") as { kills?: number; trainingKills?: number }).kills ?? 0, KEY);
  // perto do slime: ATACAR escolhe o alvo a até 145 px; o Mago segue, lança a magia e derruba o slime
  await expect.poll(async () => { await page.keyboard.press("Space"); return kills(); }, { timeout: 45_000, intervals: [400], message: "o Mago derrotou um slime da caverna com a magia" }).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
