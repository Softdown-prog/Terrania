import { CREATURE_CATALOG, type RegionalCreatureKind } from "../../actors/CreatureCatalog.ts";
import { rollCreatureLoot } from "../../actors/RegionalMonster.ts";
import { grantExperience } from "../character/Experience.ts";
import type { OfflineSimulation } from "../OfflineSimulation.ts";

/** O que a caverna precisa expor para premiar o herói; `CaveRoom` já cumpre isso. */
export interface CaveVictorySource {
  drainVictories(): Array<{ kind: RegionalCreatureKind; id: string }>;
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
    for (const item of rollCreatureLoot(victory.kind, victory.id)) sim.inventory.addMaterial(item);
    changed = true;
  }
  return changed;
}
