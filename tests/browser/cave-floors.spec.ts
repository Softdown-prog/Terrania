import { expect, test, type Page } from "@playwright/test";
import { caveEntranceInCell, type CaveEntrance } from "../../src/world/caves.ts";
import { CAVE_EXIT, CAVE_HEIGHT, CAVE_STAIRS_DOWN, CAVE_WIDTH, CaveFloor } from "../../src/world/caveFloor.ts";
import { caveFloorCount } from "../../src/dungeons/index.ts";
import { CaveRoom } from "../../src/engine/rooms/CaveRoom.ts";

/**
 * Masmorra de vários andares no jogo de verdade (ADR 0018): entrar, descer pela escada, subir de volta
 * e sair. O herói anda pelo teclado, guiado pela posição que a própria tela mostra (`#coords`).
 */
const SEED = 842136;
type Tile = { x: number; y: number };

function threeFloorDesertCave(): CaveEntrance {
  for (let cx = -12; cx <= 12; cx++) {
    const entrance = caveEntranceInCell(cx, 125, SEED);
    if (entrance?.theme === "desert" && caveFloorCount(entrance) === 3) return entrance;
  }
  throw new Error("nenhuma Cripta das Dunas de 3 andares nos arredores");
}

/** Caminho por tiles "seguros" (o tile e os 8 vizinhos são chão): o herói nunca encosta na parede. */
function safePath(floor: CaveFloor, from: Tile, to: Tile): Tile[] | null {
  const safe = (x: number, y: number): boolean => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (floor.at(x + dx, y + dy) !== 1) return false;
    return true;
  };
  const key = (t: Tile): number => t.y * CAVE_WIDTH + t.x;
  const parent = new Map<number, Tile | null>([[key(from), null]]);
  const queue: Tile[] = [from];
  while (queue.length) {
    const here = queue.shift()!;
    if (here.x === to.x && here.y === to.y) {
      const path: Tile[] = [];
      for (let t: Tile | null = here; t; t = parent.get(key(t)) ?? null) path.unshift(t);
      return path;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const next = { x: here.x + dx, y: here.y + dy };
      if (next.x < 1 || next.y < 1 || next.x >= CAVE_WIDTH - 1 || next.y >= CAVE_HEIGHT - 1 ||
          parent.has(key(next)) || !safe(next.x, next.y)) continue;
      parent.set(key(next), here);
      queue.push(next);
    }
  }
  return null;
}

async function heroTile(page: Page): Promise<Tile> {
  const text = (await page.locator("#coords").textContent()) ?? "";
  const match = /X\s+(-?\d+)\s+·\s+Y\s+(-?\d+)/.exec(text);
  if (!match) throw new Error("coordenadas ilegíveis: " + text);
  return { x: Number(match[1]), y: Number(match[2]) };
}

/** Anda até `goal` (um tile) ou até `done()` ficar verdadeiro; refaz o caminho a cada passo. */
async function walk(page: Page, floor: CaveFloor, goal: Tile, done: () => Promise<boolean>): Promise<void> {
  for (let step = 0; step < 300; step++) {
    if (await done()) return;
    const here = await heroTile(page);
    const path = safePath(floor, here, goal);
    expect(path, `existe caminho seguro de ${here.x},${here.y} até ${goal.x},${goal.y}`).not.toBeNull();
    const next = path![1] ?? goal;
    const key = next.x > here.x ? "d" : next.x < here.x ? "a" : next.y > here.y ? "s" : "w";
    await page.keyboard.down(key);
    await page.waitForTimeout(110);
    await page.keyboard.up(key);
  }
  throw new Error("o herói não chegou ao destino");
}

test("masmorra de 3 andares: descer, subir e sair pela mesma entrada (desktop/Android)", async ({ page }, info) => {
  test.setTimeout(150_000);
  const entrance = threeFloorDesertCave();
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  // O teste é de andares, não de combate: os monstros dos três andares já estão derrotados (a lista
  // vem do próprio motor) e o herói é forte (nível 100). O povoamento tem os seus testes unitários.
  const defeated = [1, 2, 3].flatMap(floorIndex =>
    [...new CaveRoom(entrance, 100, 100, new Set(), { floorIndex }).monsters.keys()]);
  expect(defeated.length).toBeGreaterThan(8);
  await page.addInitScript(({ x, y, defeated }) => {
    localStorage.setItem("terrania-origins-v1", JSON.stringify({
      seed: 842136, x, y, hp: 1090, kills: 0, defeated, experience: 148500,
    }));
    localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false }));
  }, { x: entrance.x, y: entrance.y, defeated });
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  const action = page.locator("#talkButton");
  await expect(action).toContainText("Entrar (E)");
  if (info.project.name === "android") await action.tap(); else await action.click();

  const progress = page.locator("#questProgress");
  await expect(progress).toContainText("Andar 1 de 3 · Galerias de Areia");
  await expect(page.locator("#gameNotice")).toContainText("Andar 1 de 3");
  await page.locator("canvas#game").focus();

  // Andar 1 → 2: a escada que desce fica na câmara do fundo.
  const floor1 = new CaveFloor(entrance, 1, 3);
  await walk(page, floor1, CAVE_STAIRS_DOWN, async () => /Andar 2 de 3/.test((await progress.textContent()) ?? ""));
  await expect(progress).toContainText("Andar 2 de 3 · Túnel dos Contrabandistas");
  await expect(page.locator("#gameNotice")).toContainText("desceu");
  await page.locator("canvas#game").screenshot({ path: test.info().outputPath("andar-2.png") });

  // Andar 2 → 1: a escada de saída agora sobe um andar (não sai da caverna).
  const floor2 = new CaveFloor(entrance, 2, 3);
  await walk(page, floor2, CAVE_EXIT, async () => /Andar 1 de 3/.test((await progress.textContent()) ?? ""));
  await expect(progress).toContainText("Andar 1 de 3 · Galerias de Areia");
  await expect(page.locator("#gameNotice")).toContainText("subiu");
  await expect(page.locator("#coords")).toContainText("Subsolo");

  // Andar 1 → superfície: voltou exatamente à entrada.
  await walk(page, floor1, CAVE_EXIT, async () => !/Subsolo/.test((await page.locator("#coords").textContent()) ?? ""));
  await expect(page.locator("#coords")).toHaveText(`X ${entrance.tileX} · Y ${entrance.tileY}`);
  await expect(page.locator("#gameNotice")).toContainText("retornou à superfície");
  expect(errors).toEqual([]);
});
