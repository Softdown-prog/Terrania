import { OfflineSimulation } from "../engine/OfflineSimulation.ts";
import { canStrike } from "../engine/combat.ts";
import { PICKUP_DISTANCE } from "../engine/loot.ts";
import { TapNavigator, clearPath, findWalkingPath, type Point } from "../engine/TapNavigator.ts";
import { TILE_SIZE, chunkOf } from "../world/terrain.ts";

const DT = 1 / 60;
const STILL: Point = { x: 0, y: 0 };
const APPROACH: readonly Point[] = [
  { x: -36, y: 0 }, { x: 36, y: 0 }, { x: 0, y: -36 }, { x: 0, y: 36 },
  { x: -26, y: -26 }, { x: 26, y: -26 }, { x: -26, y: 26 }, { x: 26, y: 26 },
];
const FIGHT_BUDGET = 2200;
const PICKUP_BUDGET = 420;
const MAX_DEATHS = 2;

export interface ExpeditionEncounter {
  readonly monsterId: string;
  readonly region: string;
  readonly initialPosition: Point;
  readonly finalPosition: Point;
  readonly outcome: "defeated" | "died" | "stuck" | "escaped";
  readonly ticks: number;
  readonly lootCollected: boolean;
  readonly failedReplans: number;
  readonly hpBefore: number;
  readonly hpAfter: number;
}
export interface ExpeditionQaReport {
  readonly environment: "natural-expedition-offline";
  readonly seed: number;
  readonly status: "passed" | "failed" | "incomplete";
  readonly targetKills: number;
  readonly ticks: number;
  readonly kills: number;
  readonly gelCollected: number;
  readonly deaths: number;
  readonly walkedUnits: number;
  readonly tilesVisited: number;
  readonly regionsVisited: readonly string[];
  readonly blockedSteps: number;
  readonly failedRoutes: number;
  readonly encounters: readonly ExpeditionEncounter[];
  readonly findings: readonly {
    type: "discovery" | "navigation" | "combat" | "loot" | "exploration";
    status: "passed" | "failed" | "skipped";
    detail: string;
    tick: number;
    position: Point;
    monsterId: string | null;
  }[];
  readonly capabilities: {
    readonly naturalSpawns: true;
    readonly multipleEncounters: true;
    readonly realMovement: true;
    readonly realAiAndCombat: true;
    readonly naturalLoot: true;
    readonly deathObservation: true;
    readonly browser: false;
    readonly multiplayer: false;
    readonly experience: false;
  };
}
export interface ExpeditionQaOptions {
  readonly seed?: number;
  readonly targetKills?: number;
  readonly maxTicks?: number;
}
const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
const heading = (a: Point, b: Point): Point => {
  const n = distance(a, b);
  return n > 0.01 ? { x: (b.x - a.x) / n, y: (b.y - a.y) / n } : STILL;
};
const coords = (p: Point): Point => ({ x: p.x, y: p.y });
const region = (p: Point): string => chunkOf(p.x) + "," + chunkOf(p.y);

/**
 * Uma única aventura offline; sem injetar slimes, drops, recompensas, saves
 * ou coordenadas. Não confundir com teste de navegador ou multiplayer.
 */
export function runExpeditionQa(options: ExpeditionQaOptions = {}): ExpeditionQaReport {
  const seed = options.seed ?? 842136;
  const targetKills = options.targetKills ?? 2;
  const maxTicks = options.maxTicks ?? 9000;
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new RangeError("seed fora do intervalo uint32");
  if (!Number.isSafeInteger(targetKills) || targetKills < 1 || targetKills > 4)
    throw new RangeError("targetKills deve ser 1..4");
  if (!Number.isSafeInteger(maxTicks) || maxTicks < 120 || maxTicks > 24000)
    throw new RangeError("maxTicks deve ser 120..24000");

  const sim = new OfflineSimulation(seed);
  const nav = new TapNavigator();
  const encounters: ExpeditionEncounter[] = [];
  const findings: ExpeditionQaReport["findings"][number][] = [];
  const visitedTiles = new Set<string>();
  const visitedRegions = new Set<string>();
  const unreachable = new Set<string>();
  let ticks = 0;
  let deaths = 0;
  let walkedUnits = 0;
  let blockedSteps = 0;
  let failedRoutes = 0;
  let collected = 0;
  let completed = 0;
  let currentMonster: string | null = null;

  const at = (): Point => coords(sim.player);
  const record = (
    type: ExpeditionQaReport["findings"][number]["type"],
    status: ExpeditionQaReport["findings"][number]["status"],
    detail: string,
  ): void => {
    findings.push({ type, status, detail, tick: ticks, position: at(), monsterId: currentMonster });
  };
  const mark = (): void => {
    const p = at();
    visitedTiles.add(Math.floor(p.x / TILE_SIZE) + "," + Math.floor(p.y / TILE_SIZE));
    visitedRegions.add(region(p));
  };
  const step = (input: Point, attack = false): boolean => {
    const before = at();
    const actor = sim.player;
    sim.update(DT, input, attack);
    ticks++;
    const travelled = distance(before, sim.player);
    walkedUnits += travelled;
    if (Math.hypot(input.x, input.y) > 0.2 && travelled < 0.02) blockedSteps++;
    if (sim.player !== actor) deaths++;
    mark();
    return sim.player !== actor;
  };

  mark();
  step(STILL); // dispara o mesmo spawnNearby que o jogo usa
  record("discovery", sim.slimes.size ? "passed" : "failed",
    "Slimes naturais identificados no mapa: " + sim.slimes.size);

  for (let search = 0; search < 30 && completed < targetKills &&
       ticks < maxTicks && deaths <= MAX_DEATHS; search++) {
    const candidates = [...sim.slimes.values()]
      .filter(m => !unreachable.has(m.id) && distance(sim.player, m) < 600)
      .sort((a, b) => distance(sim.player, a) - distance(sim.player, b) ||
        a.id.localeCompare(b.id));
    let candidateId: string | null = null;
    let approach: Point | null = null;
    for (const mob of candidates.slice(0, 24)) {
      for (const offset of APPROACH) {
        const target: Point = { x: mob.x + offset.x, y: mob.y + offset.y };
        if (sim.collision.canMove(target.x, target.y) &&
            findWalkingPath(at(), target, sim.collision)) {
          candidateId = mob.id;
          approach = target;
          break;
        }
      }
      if (candidateId) break;
      unreachable.add(mob.id);
      failedRoutes++;
    }
    if (!candidateId || !approach) {
      record("navigation", "failed", "Sem próximo slime natural com rota A* caminhável");
      break;
    }

    currentMonster = candidateId;
    const before = at();
    const hpBefore = sim.player.hp;
    const fightStart = ticks;
    let missed = 0;
    let dead = false;
    let lastPlanTick = ticks;
    const route = nav.go(at(), approach, sim.collision);
    if (!route) {
      unreachable.add(candidateId);
      failedRoutes++;
      record("navigation", "failed", "Rota planejada desapareceu antes do início");
      continue;
    }
    let outcome: ExpeditionEncounter["outcome"] = "escaped";
    for (let i = 0; i < FIGHT_BUDGET && ticks < maxTicks; i++) {
      const mob = sim.slimes.get(candidateId);
      if (!mob) {
        outcome = sim.defeated.has(candidateId) ? "defeated" : "escaped";
        break;
      }
      const here = at(), there: Point = { x: mob.x, y: mob.y };
      const d = distance(here, there);
      const clear = d < 110 && clearPath(here, there, sim.collision);
      const attack = d < 45 && sim.player.attackCooldown <= 0 &&
        canStrike(sim.player, mob, sim.collision);
      let input: Point;
      if (clear) {
        input = d > 30 ? heading(here, there) : STILL;
      } else {
        if (!nav.target && ticks - lastPlanTick > 8 && missed < 16) {
          let found = false;
          for (const offset of APPROACH) {
            const target = { x: there.x + offset.x, y: there.y + offset.y };
            if (sim.collision.canMove(target.x, target.y) &&
                nav.go(here, target, sim.collision)) {
              found = true;
              break;
            }
          }
          if (!found) failedRoutes++;
          missed++;
          lastPlanTick = ticks;
        }
        input = nav.target ? nav.direction(here, DT) : STILL;
      }
      dead = step(input, attack);
      if (dead) { outcome = "died"; break; }
      if (!clear && !nav.target && missed >= 16) {
        outcome = "stuck";
        break;
      }
    }
    if (sim.defeated.has(candidateId)) outcome = "defeated";
    nav.cancel();

    let lootCollected = false;
    if (outcome === "defeated") {
      completed++;
      const beforeGel = sim.inventory.gel;
      // O pickup pode ter acontecido no mesmo tick do golpe fatal. Nesse
      // caso o inventário já contém o gel e não resta drop no chão.
      if (!sim.drops.has(candidateId) && sim.inventory.gel > collected)
        lootCollected = true;
      for (let i = 0; !lootCollected && i < PICKUP_BUDGET && ticks < maxTicks; i++) {
        const drop = sim.drops.get(candidateId);
        if (!drop) break;
        const near = distance(sim.player, drop) <= PICKUP_DISTANCE;
        const input = near ? STILL : heading(at(), drop);
        const diedPicking = step(input);
        if (!sim.drops.has(candidateId) && sim.inventory.gel > collected)
          lootCollected = true;
        if (diedPicking) break;
      }
      if (lootCollected) collected++;
      record("combat", "passed", "Slime natural derrotado com movimento e ataque real");
      record("loot", lootCollected ? "passed" : "failed",
        lootCollected ? "Gel recolhido do drop real" :
          "Drop não encontrado ou coleta bloqueada; gel no início: " + beforeGel);
    } else {
      unreachable.add(candidateId);
      record("combat", "failed", "Encontro não concluído: " + outcome);
      record("loot", "skipped", "Sem abate confirmado");
    }
    encounters.push({
      monsterId: candidateId,
      region: region(before),
      initialPosition: before,
      finalPosition: at(),
      outcome,
      ticks: ticks - fightStart,
      lootCollected,
      failedReplans: missed,
      hpBefore,
      hpAfter: sim.player.hp,
    });
    currentMonster = null;
  }

  if (completed < targetKills)
    record("exploration", "failed",
      "Meta de " + targetKills + " encontros não concluída; derrotados: " + completed);
  else
    record("exploration", "passed",
      "Meta de " + targetKills + " slimes naturais concluída");

  record("navigation", visitedRegions.size >= 2 ? "passed" : "failed",
    "Regiões realmente visitadas: " + [...visitedRegions].join("; "));

  const failed = findings.filter(f => f.status === "failed").length;
  const skipped = findings.filter(f => f.status === "skipped").length;
  return {
    environment: "natural-expedition-offline", seed,
    status: failed ? "failed" : skipped ? "incomplete" : "passed",
    targetKills, ticks, kills: sim.kills,
    gelCollected: collected, deaths,
    walkedUnits: Number(walkedUnits.toFixed(2)),
    tilesVisited: visitedTiles.size,
    regionsVisited: [...visitedRegions].sort(),
    blockedSteps, failedRoutes,
    encounters, findings,
    capabilities: {
      naturalSpawns: true, multipleEncounters: true,
      realMovement: true, realAiAndCombat: true, naturalLoot: true,
      deathObservation: true, browser: false, multiplayer: false, experience: false,
    },
  };
}
