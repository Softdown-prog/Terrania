import { OfflineSimulation } from "../engine/OfflineSimulation.ts";
import { Slime } from "../actors/Slime.ts";
import { canStrike } from "../engine/combat.ts";
import { POTION_HEAL, QUEST_REWARD_POTIONS } from "../engine/Inventory.ts";
import { PICKUP_DISTANCE } from "../engine/loot.ts";
import type { Point } from "../engine/TapNavigator.ts";

const STEP = 1 / 60;
const ZERO: Point = { x: 0, y: 0 };
const ENCOUNTERS = 5;
const MAX_PREPARATION_TICKS = 240;
const MAX_COMBAT_TICKS = 480;
const MAX_PICKUP_TICKS = 240;

export type CombatCheckStatus = "passed" | "failed" | "skipped";
export interface CombatQaFinding {
  readonly id: string;
  readonly category: "movement" | "combat" | "loot" | "quest" | "potion" | "persistence";
  readonly status: CombatCheckStatus;
  readonly detail: string;
  readonly tick: number;
  readonly position: Point;
}
export interface CombatQaReport {
  readonly environment: "controlled-offline-encounters";
  readonly seed: number;
  readonly status: "passed" | "failed" | "incomplete";
  readonly ticks: number;
  readonly kills: number;
  readonly gelCollected: number;
  readonly potionsAwarded: number;
  readonly potionsUsed: number;
  readonly checks: readonly CombatQaFinding[];
  readonly totals: { readonly passed: number; readonly failed: number; readonly skipped: number };
  readonly capabilities: {
    readonly combat: true;
    readonly loot: true;
    readonly questReward: true;
    readonly potion: true;
    readonly persistence: true;
    readonly randomNaturalSpawns: false;
    readonly browser: false;
    readonly multiplayer: false;
  };
}

/**
 * Laboratório em memória: o herói CAMINHA e usa os métodos públicos reais
 * do jogo. Somente monstros de treino são injetados em locais caminháveis.
 * Este cenário NÃO atesta spawns naturais, IA de batalha ou multiplayer.
 */
export function runCombatQa(seed: number = 842136): CombatQaReport {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new RangeError("seed precisa ser um uint32");

  const sim = new OfflineSimulation(seed);
  const checks: CombatQaFinding[] = [];
  let ticks = 0;
  let potionsAwarded = 0;
  let potionsUsed = 0;
  const location = (): Point => ({ x: sim.player.x, y: sim.player.y });
  const record = (id: string, category: CombatQaFinding["category"],
      status: CombatCheckStatus, detail: string): void => {
    checks.push({ id, category, status, detail, tick: ticks, position: location() });
  };
  const step = (direction: Point, attack: boolean = false): void => {
    sim.update(STEP, direction, attack);
    ticks++;
  };

  // Percurso do personagem por movimentação real até a zona segura da vila.
  let preparationTicks = 0;
  while (sim.player.x < 224 && preparationTicks < MAX_PREPARATION_TICKS) {
    step({ x: 1, y: 0 });
    preparationTicks++;
  }
  for (let i = 0; i < 20; i++) step(ZERO);
  const inVillage = sim.player.x >= 224 && sim.collision.canMove(sim.player.x, sim.player.y);
  record("village-training-ground", "movement", inVillage ? "passed" : "failed",
    inVillage ? "Chegou caminhando à zona de treino" :
      "Não alcançou a zona de treino por movimento real");

  if (inVillage) {
    for (let index = 0; index < ENCOUNTERS; index++) {
      const id = "qa-training-slime-" + (index + 1);
      // Limpa spawns incidentais para garantir que somente o adversário
      // identificado possa ser contabilizado neste encontro controlado.
      sim.slimes.clear();
      const start = location();
      const spawn = { x: start.x + 38, y: start.y };
      if (!sim.collision.canMove(spawn.x, spawn.y)) {
        record(id, "combat", "failed", "Ponto de treino bloqueado pela colisão real");
        record(id, "loot", "skipped", "Combate não pôde começar");
        continue;
      }
      const slime = new Slime(id, spawn.x, spawn.y);
      sim.slimes.set(id, slime);
      const killsBefore = sim.kills;
      const gelBefore = sim.inventory.gel;
      let battleTicks = 0;
      while (sim.slimes.has(id) && battleTicks < MAX_COMBAT_TICKS) {
        const target = sim.slimes.get(id);
        if (!target) break;
        const dx = target.x - sim.player.x, dy = target.y - sim.player.y;
        const d = Math.hypot(dx, dy);
        const direction = d > 30 ? { x: dx / d, y: dy / d } : ZERO;
        const attack = d < 44 && sim.player.attackCooldown <= 0 &&
          canStrike(sim.player, target, sim.collision);
        step(direction, attack);
        battleTicks++;
      }
      const killed = !sim.slimes.has(id) && sim.kills === killsBefore + 1 &&
        sim.defeated.has(id);
      record(id, "combat", killed ? "passed" : "failed",
        killed ? "Slime derrotado com alcance, dano e cooldown reais" :
          "Slime não foi derrotado no limite de " + MAX_COMBAT_TICKS + " ticks");
      if (!killed) {
        record(id, "loot", "skipped", "Slime não derrotado");
        continue;
      }

      let pickupTicks = 0;
      while (sim.inventory.gel === gelBefore && pickupTicks < MAX_PICKUP_TICKS) {
        const drop = sim.drops.get(id);
        if (!drop) break;
        const dx = drop.x - sim.player.x, dy = drop.y - sim.player.y;
        const d = Math.hypot(dx, dy);
        const direction = d > PICKUP_DISTANCE * 0.6 ?
          { x: dx / d, y: dy / d } : ZERO;
        step(direction);
        pickupTicks++;
      }
      const pickedUp = sim.inventory.gel === gelBefore + 1 && !sim.drops.has(id);
      record(id, "loot", pickedUp ? "passed" : "failed",
        pickedUp ? "Gel recolhido caminhando até o drop real" :
          "Drop não recolhido antes do limite; nenhuma coleta foi simulada");
    }
  } else {
    for (let i = 1; i <= ENCOUNTERS; i++) {
      const id = "qa-training-slime-" + i;
      record(id, "combat", "skipped", "Zona de treino inalcançável");
      record(id, "loot", "skipped", "Zona de treino inalcançável");
    }
  }

  const completedQuest = sim.kills === ENCOUNTERS;
  const firstClaim = sim.inventory.claimAelaReward(sim.kills);
  const secondClaim = sim.inventory.claimAelaReward(sim.kills);
  potionsAwarded = firstClaim ? sim.inventory.potion : 0;
  const correctReward = completedQuest && firstClaim && !secondClaim &&
    potionsAwarded === QUEST_REWARD_POTIONS;
  record("aela-quest-reward", "quest", correctReward ? "passed" : "failed",
    correctReward ? "Cinco vitórias concederam poções uma única vez" :
      "Recompensa não foi desbloqueada corretamente após derrotas reais");

  if (correctReward) {
    const damaged = sim.player.takeDamage(9, sim.player.x - 10, sim.player.y);
    const hpBefore = sim.player.hp;
    const potionsBefore = sim.inventory.potion;
    const consumed = sim.inventory.usePotion(sim.player);
    if (consumed) potionsUsed++;
    const expectedHp = Math.min(sim.player.maxHp, hpBefore + POTION_HEAL);
    const notAtFull = !sim.inventory.usePotion(sim.player);
    const restored = damaged && consumed && sim.player.hp === expectedHp &&
      sim.inventory.potion === potionsBefore - 1 && notAtFull;
    record("healing-potion", "potion", restored ? "passed" : "failed",
      restored ? "Dano real curado com consumo único e limite de vida" :
        "Consumo de poção, recuperação ou bloqueio de vida cheia incorreto");
  } else {
    record("healing-potion", "potion", "skipped",
      "Recompensa necessária não foi obtida pelo combate");
  }

  const saved = sim.snapshot();
  const restored = new OfflineSimulation(seed, saved);
  const consistent = restored.kills === sim.kills &&
    restored.inventory.gel === sim.inventory.gel &&
    restored.inventory.potion === sim.inventory.potion &&
    restored.inventory.questRewardClaimed === sim.inventory.questRewardClaimed &&
    saved.defeated.length === restored.defeated.size;
  record("save-restore", "persistence", consistent ? "passed" : "failed",
    consistent ? "XP ainda ausente; derrotas, gel, poções e recompensa restaurados" :
      "Estado de combate/inventário divergente após serialização");

  const passed = checks.filter(c => c.status === "passed").length;
  const failed = checks.filter(c => c.status === "failed").length;
  const skipped = checks.filter(c => c.status === "skipped").length;
  return {
    environment: "controlled-offline-encounters", seed,
    status: failed ? "failed" : skipped ? "incomplete" : "passed",
    ticks, kills: sim.kills, gelCollected: sim.inventory.gel,
    potionsAwarded, potionsUsed, checks,
    totals: { passed, failed, skipped },
    capabilities: {
      combat: true, loot: true, questReward: true, potion: true,
      persistence: true, randomNaturalSpawns: false,
      browser: false, multiplayer: false,
    },
  };
}
