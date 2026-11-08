import { OfflineSimulation } from "../engine/OfflineSimulation.ts";
import { TapNavigator, findWalkingPath, type Point } from "../engine/TapNavigator.ts";
import { InteriorRoom } from "../engine/InteriorRoom.ts";
import { NPCS, nearestNpc, npcDialogue, type Npc } from "../world/npcs.ts";
import { TILE_SIZE, chunkOf } from "../world/terrain.ts";
import { Room } from "../../server/src/Room.ts";

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
    sim.update(STEP_SECONDS, direction, false);
    const travelled = distance(before, sim.player);
    if (sim.respawn()) {
      deaths++;
      navigator.cancel();
    }
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


/** Patrulha autoritativa isolada do QA-BOT-001.
 * Executa as mesmas chamadas de movimento do servidor online; não usa teleporte,
 * jogador com poderes especiais, VPS, conta ou conexão de produção.
 * Não é teste de WebSocket: o transporte permanece coberto pelos testes de integração.
 */
export interface OnlinePatrolQaReport {
  readonly botId: typeof QA_BOT_ID;
  readonly environment: "authoritative-room-memory";
  readonly seed: number;
  readonly status: "passed" | "failed";
  readonly regionsVisited: readonly string[];
  readonly tilesVisited: number;
  readonly walkedUnits: number;
  readonly blockedTicks: number;
  readonly deaths: number;
  readonly snapshotsChecked: number;
  readonly ticks: number;
  readonly routeAttempts: number;
  readonly routeFailures: number;
  readonly findings: readonly { kind: "navigation" | "collision" | "snapshot" | "death" | "coverage";
    detail: string; tick: number; x: number; y: number }[];
  readonly capabilities: { readonly multiplayerRules: true; readonly realMovement: true; readonly websocket: false };
}
export function runOnlinePatrolQa(maxTicks = 8000): OnlinePatrolQaReport {
  if (!Number.isSafeInteger(maxTicks) || maxTicks < 300 || maxTicks > 12000)
    throw new RangeError("maxTicks da patrulha deve ser 300..12000");
  const room = new Room("origins");
  const bot = room.add(QA_BOT_ID.toLowerCase(), "Patrulha QA", true, true, true, true, true, true);
  room.add("observer", "Observador QA", false);
  const findings: OnlinePatrolQaReport["findings"][number][] = [];
  let ticks = 0, walkedUnits = 0, blockedTicks = 0, deaths = 0;
  let snapshotsChecked = 0, routeAttempts = 0, routeFailures = 0;
  let now = bot.lastInputAt;
  const tiles = new Set<string>();
  const regions = new Set<string>();
  const record = (kind: OnlinePatrolQaReport["findings"][number]["kind"], detail: string): void => {
    findings.push({ kind, detail, tick: ticks, x: bot.actor.x, y: bot.actor.y });
  };
  const mark = (): void => {
    tiles.add(Math.floor(bot.actor.x / TILE_SIZE) + "," + Math.floor(bot.actor.y / TILE_SIZE));
    regions.add(chunkOf(bot.actor.x) + "," + chunkOf(bot.actor.y));
  };
  const snap = (): void => {
    const received = room.snapshotFor(bot.id);
    const self = received?.players.find(hero => hero.id === bot.id);
    snapshotsChecked++;
    if (!self || Math.abs(self.x - bot.actor.x) > 0.001 || Math.abs(self.y - bot.actor.y) > 0.001 ||
        !Number.isFinite(self.hp) || received?.inventory?.gel !== bot.inventory?.bag.gel) {
      record("snapshot", "Snapshot privado divergiu do jogador autoritativo");
    }
    if (room.snapshotFor("observer")?.inventory !== undefined) {
      record("snapshot", "Bolsa privada vazou ao cliente observador sem inventário");
    }
  };
  const advance = (): void => {
    const before = { x: bot.actor.x, y: bot.actor.y };
    room.tick(0.05, now += 50);
    ticks++;
    const moved = Math.hypot(bot.actor.x - before.x, bot.actor.y - before.y);
    walkedUnits += moved;
    if (moved < 0.01) blockedTicks++;
    if (!room.world.canMove(bot.actor.x, bot.actor.y)) {
      record("collision", "Bot atravessou terreno, marco ou prédio bloqueado");
    }
    if (moved > 8) record("navigation", "Deslocamento impossível em um tick de 50ms");
    if (bot.actor.hp <= 0 || moved > 120) deaths++;
    mark();
    if (ticks % 5 === 0) snap();
  };
  // A escolha é dinâmica: rotas somente para tiles livres confirmados por A*,
  // mas quem realmente caminha é a máquina de estados da Room, como em produção.
  const dirs = [[-1, 0], [0, -1], [1, 0], [0, 1], [-1, -1], [1, -1], [1, 1], [-1, 1]] as const;
  mark();
  const selectedRegions = new Set<string>();
  for (let stage = 0; stage < dirs.length && ticks < maxTicks; stage++) {
    const [dx, dy] = dirs[stage]!;
    const ox = Math.floor(bot.actor.x / TILE_SIZE), oy = Math.floor(bot.actor.y / TILE_SIZE);
    let goal: Point | null = null;
    // Rotaciona opções para fugir de rios e construções, sem furar colisão.
    for (const length of [9, 7, 5, 3])
      for (const shift of [0, 2, -2, 4, -4]) {
        const gx = ox + dx * length + (dy ? shift : 0);
        const gy = oy + dy * length + (dx ? shift : 0);
        const candidate = { x: gx * TILE_SIZE + 16, y: gy * TILE_SIZE + 16 };
        if (!room.world.canMove(candidate.x, candidate.y)) continue;
        const nav = new TapNavigator();
        if (!nav.go(bot.actor, candidate, room.world, true, 480)) continue;
        // Preferir cruzar chunks de verdade; nunca mudar coordenadas diretamente.
        if (chunkOf(candidate.x) + "," + chunkOf(candidate.y) !==
            chunkOf(bot.actor.x) + "," + chunkOf(bot.actor.y)) { goal = candidate; break; }
        goal ??= candidate;
      }
    if (!goal) { routeFailures++; record("navigation", "Nenhuma rota caminhável para a etapa " + stage); continue; }
    routeAttempts++;
    const from = position(bot.actor);
    room.receiveWalk(bot.id, goal);
    let reached = false;
    for (let budget = 0; budget < 1000 && ticks < maxTicks; budget++) {
      advance();
      if (Math.hypot(bot.actor.x - goal.x, bot.actor.y - goal.y) < 1.5) {
        reached = true; break;
      }
      if (bot.actor.hp <= 0) break;
      if (budget > 30 && bot.walking?.navigator.target === null &&
          bot.walking.walker.destination === null) break;
    }
    if (reached) {
      const regionName = chunkOf(bot.actor.x) + "," + chunkOf(bot.actor.y);
      selectedRegions.add(regionName);
      record("coverage", "Etapa " + stage + " percorrida de (" + from.x + "," + from.y +
        ") até (" + goal.x + "," + goal.y + "), região " + regionName);
    } else {
      routeFailures++;
      record("navigation", "Rota não chegou ao tile livre: " + goal.x + "," + goal.y);
    }
    room.receiveWalk(bot.id, null);
  }
  if (regions.size < 3 || walkedUnits < 180)
    record("coverage", "Cobertura insuficiente: " + regions.size + " regiões e " +
      Math.round(walkedUnits) + " unidades realmente caminhadas");
  const broken = findings.some(f => f.kind === "collision" || f.kind === "snapshot" ||
    (f.kind === "navigation" && f.detail.startsWith("Deslocamento impossível")));
  const status = broken || regions.size < 3 || walkedUnits < 180 ? "failed" : "passed";
  return { botId: QA_BOT_ID, environment: "authoritative-room-memory", seed: room.seed, status,
    regionsVisited: [...regions].sort(), tilesVisited: tiles.size, walkedUnits: Number(walkedUnits.toFixed(2)),
    blockedTicks, deaths, snapshotsChecked, ticks, routeAttempts, routeFailures, findings,
    capabilities: { multiplayerRules: true, realMovement: true, websocket: false } };
}
