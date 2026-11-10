import type { CreatureDefinition } from "../../types.ts";
import type { SpeciesBehavior } from "../../behavior.ts";
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
