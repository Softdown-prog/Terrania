import type { CreatureDefinition } from "../../types.ts";
import type { SpeciesBehavior } from "../../behavior.ts";
import { hash2 } from "../../../world/random.ts";
import { southRareDrop } from "../../rareLoot.ts";

/** dune-rat: ficha da região Sul. */
export const duneRat = {
    name: "Rato das Dunas", maxHp: 35, contactDamage: 6, experience: 16,
    nature: "physical", special: "infected-bite", speed: 90, range: 24, interval: .62,
    status: "infection", statusSeconds: 3, region: "south", caveThemes: ["desert"],
    biomes: ["oasis", "ruins", "dunes"],
    loot: [{ item: "Rabo de Rato", chance: .50 }, { item: "Carne Magra", chance: .40 }, { item: "Queijo Seco", chance: .10 }, southRareDrop("dune-rat")],
} satisfies CreatureDefinition;

/** Movimento, perseguição e retirada próprios de dune-rat; lidos pelo motor. */
export const duneRatBehavior = { gait: "skitter", pursuit: "cautious", cadence: 2.16, weave: 0.35, retreatAt: 0.5 } satisfies SpeciesBehavior;

/** A mordida só transmite infecção em 10% dos golpes que acertaram. 
 * A semente pertence ao monstro e o contador avança por golpe válido. */
export function duneRatInfectionOnBite(monsterSeed:number,landedHits:number):boolean {
  return hash2(monsterSeed,landedHits,73021)<.1;
}
