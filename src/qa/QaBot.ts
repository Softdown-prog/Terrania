import { OfflineSimulation } from "../engine/OfflineSimulation.ts";
import { TapNavigator, findWalkingPath, type Point } from "../engine/TapNavigator.ts";
import { InteriorRoom } from "../engine/InteriorRoom.ts";
import { NPCS, nearestNpc, npcDialogue, type Npc } from "../world/npcs.ts";
import { TILE_SIZE } from "../world/terrain.ts";

export const QA_BOT_ID = "QA-BOT-001";
const STEP_SECONDS = 1 / 60;
const ARRIVAL_DISTANCE = 12;
const PER_GOAL_TICKS = 2400;

export type QaStatus = "passed" | "failed" | "skipped";
export interface QaFinding {
  readonly id: string;
  readonly category: "navigation" | "interaction" | "interior";
  readonly status: QaStatus;
  readonly detail: string;
  readonly tick: number;
  readonly at: Point;
  readonly target: Point;
}
export interface QaBotReport {
  readonly schemaVersion: 1;
  readonly botId: typeof QA_BOT_ID;
  readonly environment: "offline-memory";
  readonly seed: number;
  readonly maxTicks: number;
  readonly ticks: number;
  readonly simulatedSeconds: number;
  readonly status: "passed" | "failed" | "incomplete";
  readonly checks: readonly QaFinding[];
  readonly totals: {
    readonly passed: number;
    readonly failed: number;
    readonly skipped: number;
    readonly moves: number;
    readonly walkedUnits: number;
    readonly mapTilesVisited: number;
    readonly npcInteractions: number;
    readonly interiorsVisited: number;
    readonly deaths: number;
    readonly killsObserved: number;
  };
  readonly finalPosition: Point;
  readonly capabilities: {
    readonly navigation: true;
    readonly npcDialogue: true;
    readonly interiors: true;
    readonly combat: false;
    readonly loot: false;
    readonly multiplayer: false;
    readonly experience: false;
  };
}
export interface QaBotOptions {
  readonly seed?: number;
  readonly maxTicks?: number;
}

const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
const position = (point: Point): Point => ({ x: point.x, y: point.y });


/**
 * Placas e marcos são sólidos: interagir significa chegar perto, não pisar
 * no centro. O ponto escolhido respeita a colisão e o alvo da interação.
 */
function approachPoint(sim: OfflineSimulation, npc: Npc): Point | null {
  const offsets: Point[] = [{ x: 0, y: 0 }];
  for (const r of [24, 40, 56]) {
    for (const [dx, dy] of [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [0.7, 0.7], [0.7, -0.7], [-0.7, 0.7], [-0.7, -0.7],
    ] as const) offsets.push({ x: dx * r, y: dy * r });
  }
  const candidates = offsets.map(p => ({ x: npc.x + p.x, y: npc.y + p.y }));
  // Aproxima-se do NPC correto, não de um ponto na periferia do alcance
  // que pode deixar outro NPC mais próximo no instante da interação.
  candidates.sort((a, b) => distance(a, npc) - distance(b, npc) ||
    distance(sim.player, a) - distance(sim.player, b));
  for (const point of candidates) {
    if (!sim.collision.canMove(point.x, point.y) ||
      nearestNpc(point.x, point.y)?.id !== npc.id) continue;
    if (distance(sim.player, point) <= ARRIVAL_DISTANCE ||
        findWalkingPath(sim.player, point, sim.collision)) return point;
  }
  return null;
}

/** Jogador interno, sem conta, navegador, rede, arquivos ou progresso persistente. */
export function runQaBot(options: QaBotOptions = {}): QaBotReport {
  const seed = options.seed ?? 842136;
  const maxTicks = options.maxTicks ?? 18000;
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new RangeError("seed precisa ser um uint32");
  if (!Number.isSafeInteger(maxTicks) || maxTicks < 120 || maxTicks > 36000)
    throw new RangeError("maxTicks deve ficar entre 120 e 36000");

  const sim = new OfflineSimulation(seed);
  const navigator = new TapNavigator();
  const goals: Npc[] = [...NPCS];
  const checks: QaFinding[] = [];
  const visited = new Set<string>();
  let ticks = 0;
  let moves = 0;
  let walkedUnits = 0;
  let deaths = 0;
  let interactions = 0;
  let interiors = 0;
  const markTile = (): void => {
    visited.add(Math.floor(sim.player.x / TILE_SIZE) + "," +
      Math.floor(sim.player.y / TILE_SIZE));
  };
  markTile();
  const addCheck = (npc: Npc, category: QaFinding["category"], status: QaStatus, detail: string): void => {
    checks.push({
      id: npc.id, category, status, detail, tick: ticks,
      at: position(sim.player), target: { x: npc.x, y: npc.y },
    });
  };
  const advance = (direction: Point): void => {
    const before = position(sim.player);
    const actor = sim.player;
    sim.update(STEP_SECONDS, direction, false);
    if (sim.player !== actor) deaths++;
    const travelled = distance(before, sim.player);
    if (travelled > 0.001) moves++;
    walkedUnits += travelled;
    ticks++;
    markTile();
  };

  while (goals.length) {
    goals.sort((a, b) => distance(sim.player, a) - distance(sim.player, b) ||
      a.id.localeCompare(b.id));
    const npc = goals.shift();
    if (!npc) break;
    if (ticks >= maxTicks) {
      addCheck(npc, "navigation", "skipped", "Limite global de ticks atingido");
      for (const remaining of goals)
        addCheck(remaining, "navigation", "skipped", "Limite global de ticks atingido");
      break;
    }
    const destination = approachPoint(sim, npc);
    if (!destination) {
      addCheck(npc, "navigation", "failed", "Nenhum ponto caminhável com interação disponível");
      continue;
    }
    if (distance(sim.player, destination) > ARRIVAL_DISTANCE) {
      if (!navigator.go(sim.player, destination, sim.collision)) {
        addCheck(npc, "navigation", "failed", "Não foi encontrada rota caminhável");
        continue;
      }
      const goalDeadline = Math.min(maxTicks, ticks + PER_GOAL_TICKS);
      while (ticks < goalDeadline && navigator.target &&
             distance(sim.player, destination) > ARRIVAL_DISTANCE) {
        advance(navigator.direction(sim.player, STEP_SECONDS));
      }
    }
    navigator.cancel();
    const remainingDistance = distance(sim.player, destination);
    if (remainingDistance > ARRIVAL_DISTANCE) {
      const exhausted = ticks >= maxTicks;
      addCheck(npc, "navigation", exhausted ? "skipped" : "failed",
        exhausted ? "Orçamento de ticks esgotado antes de chegar" :
          "Não chegou ao objetivo; possível bloqueio ou navegação parada");
      continue;
    }
    addCheck(npc, "navigation", "passed", "Chegou ao destino sem teletransporte");

    const selected = nearestNpc(sim.player.x, sim.player.y);
    if (selected?.id !== npc.id) {
      addCheck(npc, "interaction", "failed",
        "Interação indisponível ou direcionada a outro alvo: " + (selected?.id ?? "nenhum"));
      continue;
    }
    const lines = npcDialogue(selected, sim.kills);
    if (!lines.length || lines.some(line => !line.trim())) {
      addCheck(npc, "interaction", "failed", "NPC/placa/porta sem diálogo válido");
      continue;
    }
    interactions++;
    addCheck(npc, "interaction", "passed",
      "Interação disponível; " + lines.length + " linhas de diálogo");

    if (npc.kind === "door") {
      try {
        const room = new InteriorRoom(npc.id);
        const entry = position(room.player);
        for (let i = 0; i < 45 && ticks < maxTicks; i++) {
          room.update(STEP_SECONDS, { x: 0, y: -1 });
          ticks++;
        }
        const travelled = distance(entry, room.player);
        if (travelled >= 15 && room.collision.canMove(room.player.x, room.player.y)) {
          interiors++;
          addCheck(npc, "interior", "passed",
            "Entrou no ambiente e caminhou " + travelled.toFixed(1) + " unidades");
        } else {
          addCheck(npc, "interior", ticks >= maxTicks ? "skipped" : "failed",
            "Movimento interior insuficiente: " + travelled.toFixed(1));
        }
      } catch (error) {
        addCheck(npc, "interior", "failed", error instanceof Error ? error.message : String(error));
      }
    }
  }

  const passed = checks.filter(check => check.status === "passed").length;
  const failed = checks.filter(check => check.status === "failed").length;
  const skipped = checks.filter(check => check.status === "skipped").length;
  return {
    schemaVersion: 1, botId: QA_BOT_ID, environment: "offline-memory",
    seed, maxTicks, ticks, simulatedSeconds: Number((ticks * STEP_SECONDS).toFixed(3)),
    status: failed ? "failed" : skipped ? "incomplete" : "passed",
    checks,
    totals: {
      passed, failed, skipped, moves,
      walkedUnits: Number(walkedUnits.toFixed(2)),
      mapTilesVisited: visited.size, npcInteractions: interactions,
      interiorsVisited: interiors, deaths, killsObserved: sim.kills,
    },
    finalPosition: position(sim.player),
    capabilities: {
      navigation: true, npcDialogue: true, interiors: true,
      combat: false, loot: false, multiplayer: false, experience: false,
    },
  };
}
