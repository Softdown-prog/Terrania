import { CREATURE_CATALOG, type CreatureKind } from "../../actors/CreatureCatalog.ts";
import { rollCreatureLoot } from "../../actors/RegionalMonster.ts";
import { grantExperience } from "../character/Experience.ts";
import { MAX_KILLS } from "../Limits.ts";
import type { OfflineSimulation } from "../OfflineSimulation.ts";

/** O que a caverna precisa expor para premiar o herói; `CaveRoom` já cumpre isso. */
export interface CaveVictorySource {
  drainVictories(): Array<{ kind: CreatureKind; id: string }>;
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
    sim.experience = grantExperience(sim.experience, CREATURE_CATALOG[victory.kind].experience, cave.player);
    // O total histórico é um contador de slimes (usado também pela missão de montaria).
    if (victory.kind === "slime") sim.kills = Math.min(MAX_KILLS, sim.kills + 1);
    if (victory.kind === "slime" && victory.id.startsWith(`cave:${sim.seed}:0:0:floor:1:slime:`)) {
      sim.trainingKills = Math.min(5, sim.trainingKills + 1);
      sim.inventory.addGel();
    } else if (victory.kind !== "slime") {
      for (const item of rollCreatureLoot(victory.kind, victory.id)) sim.inventory.addMaterial(item);
    }
    changed = true;
  }
  return changed;
}
