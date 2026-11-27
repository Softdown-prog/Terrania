import { CREATURE_CATALOG, type CreatureKind } from "../../actors/CreatureCatalog.ts";
import { rollCreatureLoot } from "../../actors/RegionalMonster.ts";
import { grantExperience } from "../character/Experience.ts";
import { MAX_KILLS } from "../Limits.ts";
import type { OfflineSimulation } from "../OfflineSimulation.ts";

/** O que a caverna precisa expor para premiar o herói; `CaveRoom` já cumpre isso. */
export interface CaveVictorySource {
  drainVictories(): Array<{ kind: CreatureKind; id: string }>;
  /** Ids dos baús de toca abertos desde a última chamada (ADR 0103); quem não tem baús não precisa oferecer. */
  drainOpenings?(): string[];
  readonly player: { hp: number; maxHp: number };
}

/**
 * Converte as vitórias ocorridas na caverna em experiência e saque na simulação principal.
 * Cada criatura (pelo id) só premia uma vez. Devolve `true` se algo mudou e é preciso salvar.
 */
export function applyCaveVictories(sim: OfflineSimulation, cave: CaveVictorySource): boolean {
  let changed = false;
  for (const victory of cave.drainVictories()) {
    if (sim.defeated.has(victory.id)) continue;
    sim.defeated.add(victory.id);
    sim.noteDefeat(victory.id, victory.kind);
    sim.experience = grantExperience(sim.experience, CREATURE_CATALOG[victory.kind].experience, cave.player, sim.heroClass);
    // O total histórico é um contador de slimes (usado também pela missão de montaria).
    if (victory.kind === "slime") sim.kills = Math.min(MAX_KILLS, sim.kills + 1);
    if (victory.kind === "slime" && victory.id.startsWith(`cave:${sim.seed}:0:0:floor:1:slime:`)) sim.trainingKills = Math.min(5, sim.trainingKills + 1);
    // Os materiais da criatura vão direto para a bolsa, como na superfície; o gel e as moedas ficam no chão (`CaveRoom.drops`, ADR 0084).
    else if (victory.kind !== "slime")
      for (const item of rollCreatureLoot(victory.kind, victory.id)) sim.inventory.addMaterial(item);
    changed = true;
  }
  // Baú aberto: vai para a lista dos derrotados, com o prazo de voltar cheio (ADR 0103); as moedas já caíram no chão da caverna.
  for (const id of cave.drainOpenings?.() ?? []) {
    if (sim.defeated.has(id)) continue;
    sim.defeated.add(id);
    sim.noteDefeat(id);
    changed = true;
  }
  return changed;
}
