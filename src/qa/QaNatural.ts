import { OfflineSimulation } from "../engine/OfflineSimulation.ts";
import { canStrike } from "../engine/combat.ts";
import { PICKUP_DISTANCE } from "../engine/loot.ts";
import { TapNavigator, clearPath, findWalkingPath, type Point } from "../engine/TapNavigator.ts";

const DT = 1 / 60;
const ZERO: Point = { x: 0, y: 0 };
const MAX_FIGHT_TICKS = 2400;
const MAX_PICKUP_TICKS = 360;
const OFFSETS: readonly Point[] = [
  { x: -36, y: 0 }, { x: 36, y: 0 }, { x: 0, y: -36 }, { x: 0, y: 36 },
  { x: -26, y: -26 }, { x: 26, y: -26 }, { x: -26, y: 26 }, { x: 26, y: 26 },
];
type Status = "passed" | "failed" | "skipped";
export interface NaturalFinding {
  readonly task: "discovery" | "navigation" | "combat" | "loot";
  readonly status: Status;
  readonly detail: string;
  readonly tick: number;
  readonly position: Point;
  readonly monsterId: string | null;
}
export interface NaturalReport {
  readonly environment: "offline-natural-world";
  readonly seed: number;
  readonly status: "passed" | "failed" | "incomplete";
  readonly ticks: number;
  readonly monstersDiscovered: number;
  readonly monstersReachable: number;
  readonly targetMonsterId: string | null;
  readonly kills: number;
  readonly gel: number;
  readonly findings: readonly NaturalFinding[];
  readonly totals: { readonly passed: number; readonly failed: number; readonly skipped: number };
  readonly capabilities: {
    readonly naturalSpawns: true;
    readonly realMonsterAi: true;
    readonly realCombatAndLoot: true;
    readonly multiplayer: false;
    readonly browser: false;
    readonly experience: false;
  };
}
const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
const heading = (a: Point, b: Point): Point => {
  const d = distance(a, b);
  return d > 0.001 ? { x: (b.x - a.x) / d, y: (b.y - a.y) / d } : ZERO;
};
/** QA offline com slimes do gerador real. Não cria monstros, não teleporta jogadores. */
export function runNaturalQa(seed = 842136): NaturalReport {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new RangeError("seed precisa ser uint32");
  const sim = new OfflineSimulation(seed);
  const nav = new TapNavigator();
  const findings: NaturalFinding[] = [];
  let ticks = 0;
  let reachable = 0;
  let targetMonsterId: string | null = null;
  const at = (): Point => ({ x: sim.player.x, y: sim.player.y });
  const record = (task: NaturalFinding["task"], status: Status, detail: string): void => {
    findings.push({ task, status, detail, tick: ticks, position: at(), monsterId: targetMonsterId });
  };
  const step = (direction: Point, attack = false): void => {
    sim.update(DT, direction, attack);
    ticks++;
  };
  // Aciona o spawn natural da própria simulação, sem injetar Slime.
  step(ZERO);
  const discovered = sim.slimes.size;
  record("discovery", discovered ? "passed" : "failed", "Spawns naturais: " + discovered);
  const candidates = [...sim.slimes.values()]
    .filter(m => distance(sim.player, m) < 610)
    .sort((a, b) => distance(sim.player, a) - distance(sim.player, b) ||
      a.id.localeCompare(b.id)).slice(0, 20);
  let firstGoal: Point | null = null;
  for (const monster of candidates) {
    const points = OFFSETS.map(offset => ({
      x: monster.x + offset.x, y: monster.y + offset.y,
    })).sort((a, b) => distance(sim.player, a) - distance(sim.player, b));
    for (const p of points) {
      if (!sim.collision.canMove(p.x, p.y)) continue;
      if (findWalkingPath(sim.player, p, sim.collision)) {
        targetMonsterId = monster.id;
        firstGoal = p;
        reachable++;
        break;
      }
    }
    if (firstGoal) break;
  }
  if (!targetMonsterId || !firstGoal) {
    record("navigation", "failed", "Nenhum alvo natural alcançável por A*");
    record("combat", "skipped", "Não há monstro alcançável");
    record("loot", "skipped", "Não houve combate");
  } else {
    const started = nav.go(at(), firstGoal, sim.collision);
    record("navigation", started ? "passed" : "failed",
      started ? "Rota caminhável até slime natural" : "Rota inicial inválida");
    const startingKills = sim.kills;
    let died = false;
    let attempts = 0;
    let lastReplan = 0;
    for (let i = 0; started && i < MAX_FIGHT_TICKS; i++) {
      const monster = sim.slimes.get(targetMonsterId);
      if (!monster) break;
      const pos = at();
      const enemy = { x: monster.x, y: monster.y };
      const d = distance(pos, enemy);
      const attack = d < 45 && sim.player.attackCooldown <= 0 &&
        canStrike(sim.player, monster, sim.collision);
      let input: Point;
      if (d < 110 && clearPath(pos, enemy, sim.collision)) {
        input = d > 30 ? heading(pos, enemy) : ZERO;
      } else {
        if (!nav.target && ticks - lastReplan > 8 && attempts < 15) {
          for (const offset of OFFSETS) {
            const candidate = { x: enemy.x + offset.x, y: enemy.y + offset.y };
            if (sim.collision.canMove(candidate.x, candidate.y) &&
                nav.go(pos, candidate, sim.collision)) break;
          }
          attempts++;
          lastReplan = ticks;
        }
        input = nav.target ? nav.direction(pos, DT) : ZERO;
      }
      const playerBefore = sim.player;
      step(input, attack);
      if (sim.player !== playerBefore) { died = true; break; }
      if (attempts === 15 && !nav.target && d > 110) break;
    }
    const killed = sim.defeated.has(targetMonsterId) &&
      sim.kills === startingKills + 1;
    record("combat", killed ? "passed" : "failed",
      killed ? "Slime do mundo derrotado com ataque real" :
        died ? "Jogador morreu no combate natural" : "Combate não concluído dentro do limite");
    if (killed) {
      const originalGel = sim.inventory.gel;
      for (let i = 0; i < MAX_PICKUP_TICKS && sim.inventory.gel === originalGel; i++) {
        const drop = sim.drops.get(targetMonsterId);
        if (!drop) break;
        const input = distance(sim.player, drop) > PICKUP_DISTANCE * 0.6 ?
          heading(at(), drop) : ZERO;
        step(input);
      }
      const collected = sim.inventory.gel === originalGel + 1 &&
        !sim.drops.has(targetMonsterId);
      record("loot", collected ? "passed" : "failed",
        collected ? "Gel recolhido do slime natural" : "Drop não foi recolhido");
    } else {
      record("loot", "skipped", "Combate não concluído");
    }
  }
  const passed = findings.filter(f => f.status === "passed").length;
  const failed = findings.filter(f => f.status === "failed").length;
  const skipped = findings.filter(f => f.status === "skipped").length;
  return {
    environment: "offline-natural-world", seed,
    status: failed ? "failed" : skipped ? "incomplete" : "passed",
    ticks, monstersDiscovered: discovered, monstersReachable: reachable,
    targetMonsterId, kills: sim.kills, gel: sim.inventory.gel, findings,
    totals: { passed, failed, skipped },
    capabilities: {
      naturalSpawns: true, realMonsterAi: true, realCombatAndLoot: true,
      multiplayer: false, browser: false, experience: false,
    },
  };
}
