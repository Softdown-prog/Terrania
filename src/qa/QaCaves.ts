import { OfflineSimulation } from "../engine/OfflineSimulation.ts";
import { collectDrops } from "../engine/character/loot.ts";
import { CaveRoom } from "../engine/rooms/CaveRoom.ts";
import { applyCaveVictories } from "../engine/rooms/CaveRewards.ts";
import { caveMonsterKinds } from "../actors/RegionalMonster.ts";
import { caveFloorCount, dungeonFloor, dungeonFor } from "../dungeons/index.ts";
import { CAVE_EXIT, CAVE_HEIGHT, CAVE_STAIRS_DOWN, CAVE_WIDTH } from "../world/caveFloor.ts";
import { caveEntranceInCell, type CaveEntrance, type CaveTheme } from "../world/caves.ts";
import { TILE_SIZE } from "../world/terrain.ts";

/** As cavernas de cada tema que o bot confere (as primeiras que a varredura acha) e a varredura, em células de cavernas ao redor do centro do mundo. */
const PER_THEME = 4;
const SCAN = 10;
export type CaveCheckStatus = "passed" | "failed";
export interface CaveQaFinding {
  readonly id: string;
  readonly category: "population" | "reachability" | "loot";
  readonly status: CaveCheckStatus;
  readonly detail: string;
  readonly cave: string;
}
export interface CaveQaReport {
  readonly environment: "offline-caves";
  readonly seed: number;
  readonly status: "passed" | "failed";
  readonly themes: readonly CaveTheme[];
  readonly caves: number;
  readonly floors: number;
  readonly monsters: number;
  readonly findings: readonly CaveQaFinding[];
  readonly totals: { readonly passed: number; readonly failed: number };
}

/** O que falta à mistura de uma caverna comum do Centro (ao menos um slime, quatro tipos diferentes e só gente do Centro), ou `null` se está certa. */
export function centralRosterProblem(kinds: ReadonlySet<string>): string | null {
  const centro: readonly string[] = ["slime", ...caveMonsterKinds("verdant")], foreign = [...kinds].filter(kind => !centro.includes(kind));
  if (foreign.length) return `não é do Centro: ${foreign.sort().join(", ")}`;
  if (!kinds.has("slime")) return "sem slime";
  if (kinds.size < 4) return `só ${kinds.size} tipos`;
  return null;
}

const tileCenter = (tile: { readonly x: number; readonly y: number }): { x: number; y: number } => ({ x: (tile.x + .5) * TILE_SIZE, y: (tile.y + .5) * TILE_SIZE });

/** Os tiles de um andar que se alcança a pé a partir do herói (busca em largura sobre o chão que a colisão deixa pisar). */
function reachableTiles(room: CaveRoom): Set<number> {
  const walkable = (tx: number, ty: number): boolean => tx >= 0 && ty >= 0 && tx < CAVE_WIDTH && ty < CAVE_HEIGHT && room.collision.canMove((tx + .5) * TILE_SIZE, (ty + .5) * TILE_SIZE);
  const start = { x: Math.floor(room.player.x / TILE_SIZE), y: Math.floor(room.player.y / TILE_SIZE) };
  const seen = new Set<number>([start.y * CAVE_WIDTH + start.x]), queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const at = queue[i]!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const next = { x: at.x + dx, y: at.y + dy }, key = next.y * CAVE_WIDTH + next.x;
      if (!seen.has(key) && walkable(next.x, next.y)) { seen.add(key); queue.push(next); }
    }
  }
  return seen;
}

/**
 * Entradas de caverna comum de cada tema (não conta a gruta de treino nem as torres): o Centro fica perto do começo do mundo e os outros temas ficam longe,
 * nas oito direções (varre as células de caverna ao longo de cada eixo e diagonal, de 5 em 5 até 160 células, com uma folga para os lados).
 */
export function sampleCaves(seed: number): Map<CaveTheme, CaveEntrance[]> {
  const byTheme = new Map<CaveTheme, CaveEntrance[]>();
  const consider = (cx: number, cy: number): void => {
    const entrance = caveEntranceInCell(cx, cy, seed);
    if (!entrance || entrance.tower || entrance.id === `cave:${seed}:0:0`) return;
    const list = byTheme.get(entrance.theme) ?? [];
    if (list.length < PER_THEME && !list.some(item => item.id === entrance.id)) byTheme.set(entrance.theme, [...list, entrance]);
  };
  for (let cx = -SCAN; cx <= SCAN; cx++) for (let cy = -SCAN; cy <= SCAN; cy++) consider(cx, cy);
  for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]] as const)
    for (let n = 5; n <= 160; n += 5) for (let k = -3; k <= 3; k++) consider(ax * n + (ay === 0 ? 0 : k), ay * n + (ax === 0 ? 0 : k));
  return byTheme;
}

/**
 * Laboratório de cavernas em memória: para as cavernas de cada tema, em todos os andares, confere que **nascem povoadas** (o defeito das cavernas vazias do Centro),
 * que o herói **alcança a pé** cada criatura e as escadas, e que derrubar uma criatura deixa o saque no chão e o herói o **recolhe** (gel e moedas) com a
 * experiência. Não usa navegador, tela nem rede; só o motor real.
 */
export function runCaveQa(seed: number = 842136): CaveQaReport {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) throw new RangeError("seed precisa ser um uint32");
  const findings: CaveQaFinding[] = [];
  const record = (id: string, category: CaveQaFinding["category"], ok: boolean, detail: string, cave: string): void => { findings.push({ id, category, status: ok ? "passed" : "failed", detail, cave }); };
  const byTheme = sampleCaves(seed);
  let caves = 0, floors = 0, monsters = 0;
  for (const [theme, entrances] of byTheme) for (const entrance of entrances) {
    caves++;
    let lootChecked = false;
    for (let floorIndex = 1; floorIndex <= caveFloorCount(entrance); floorIndex++) {
      floors++;
      const room = new CaveRoom(entrance, 100, 100, new Set(), { floorIndex });
      const label = `${entrance.id} (${theme}) andar ${floorIndex}`;
      monsters += room.monsters.size;
      record("populated", "population", room.monsters.size > 0, `${room.monsters.size} criaturas`, label);
      // O povo do Centro (ADR 0087 e 0088): a Gruta das Raízes mistura slimes e as criaturas do Centro; caverna sem essa mistura é defeito de povoamento.
      if (theme === "verdant" && !dungeonFor(entrance)) {
        const kinds = new Set<string>([...room.monsters.values()].map(mob => mob.kind)), problem = centralRosterProblem(kinds);
        record("roster", "population", problem === null, problem ?? `${kinds.size} tipos: ${[...kinds].sort().join(", ")}`, label);
      }
      // Uma masmorra (Cripta, Brejo, Masmorra das Raízes): só mora quem a tabela do andar manda, e o chefe espera no último andar.
      const plan = dungeonFloor(entrance, floorIndex);
      if (plan) {
        const allowed = new Set<string>([...plan.monsters, ...(plan.boss ? [plan.boss] : [])]), stray = [...room.monsters.values()].filter(mob => !allowed.has(mob.kind));
        record("plan", "population", stray.length === 0, stray.length ? `fora da tabela do andar: ${stray.map(mob => mob.kind).sort().join(", ")}` : `só a tabela de "${plan.name}"`, label);
        if (plan.boss) record("boss", "population", [...room.monsters.keys()].some(id => id.endsWith(":boss")), `o chefe (${plan.boss}) espera no último andar`, label);
      }
      const reach = reachableTiles(room), unreachable = [...room.monsters.values()].filter(mob => !reach.has(Math.floor(mob.y / TILE_SIZE) * CAVE_WIDTH + Math.floor(mob.x / TILE_SIZE)));
      record("monsters-reachable", "reachability", unreachable.length === 0, unreachable.length ? `inalcançáveis: ${unreachable.map(mob => mob.id).join(", ")}` : "todas alcançáveis", label);
      const exit = tileCenter(CAVE_EXIT), exitTile = Math.floor(exit.y / TILE_SIZE) * CAVE_WIDTH + Math.floor(exit.x / TILE_SIZE);
      record("exit-reachable", "reachability", reach.has(exitTile), "escada de saída", label);
      if (room.floor.hasStairsDown) { const down = tileCenter(CAVE_STAIRS_DOWN); record("stairs-reachable", "reachability", reach.has(Math.floor(down.y / TILE_SIZE) * CAVE_WIDTH + Math.floor(down.x / TILE_SIZE)), "escada para baixo", label); }
      if (!lootChecked && room.monsters.size > 0) {
        lootChecked = true;
        const sim = new OfflineSimulation(seed), mob = [...room.monsters.values()][0]!, at = { id: mob.id, x: mob.x, y: mob.y }, xp = sim.experience;
        mob.hp = 0; room.update(1 / 60, { x: 0, y: 0 });
        const dropped = room.drops.size > 0 && [...room.drops.values()].every(drop => drop.x === at.x && drop.y === at.y);
        applyCaveVictories(sim, room);
        const before = sim.inventory.coins + sim.inventory.gel;
        const collected = collectDrops(room.drops, room.player, sim.inventory, true);
        record("loot-cycle", "loot", dropped && collected && room.drops.size === 0 && sim.inventory.coins + sim.inventory.gel > before && sim.experience > xp,
          `saque no chão: ${dropped}; recolhido: ${collected}; experiência: ${sim.experience > xp}`, label);
      }
    }
  }
  const failed = findings.filter(item => item.status === "failed").length;
  return { environment: "offline-caves", seed, status: failed === 0 && caves > 0 ? "passed" : "failed", themes: [...byTheme.keys()].sort(), caves, floors, monsters, findings,
    totals: { passed: findings.length - failed, failed } };
}
