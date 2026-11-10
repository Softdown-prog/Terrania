import type { CreatureDefinition } from "../../types.ts";
import type { SpeciesBehavior } from "../../behavior.ts";

/** dune-scout: ficha da região Sul. */
export const duneScout = {
    name: "Pequenino Batedor das Dunas", maxHp: 75, contactDamage: 12, experience: 34,
    nature: "physical", special: "sling", speed: 68, range: 139, interval: 1.55,
    status: null, statusSeconds: 0, region: "south", caveThemes: ["desert"],
    biomes: ["oasis", "ruins", "dunes"],
    loot: [{ item: "Bolsa de Sementes", chance: .50 }, { item: "Pedra Polida", chance: .65 }, { item: "Pão de Viagem", chance: .35 }, { item: "Moedas de Prata", chance: .50 }],
} satisfies CreatureDefinition;

/** Movimento, perseguição e retirada próprios de dune-scout; lidos pelo motor. */
export const duneScoutBehavior = { gait: "stride", pursuit: "cautious", cadence: 1.73, weave: 0.2, retreatAt: 0.45 } satisfies SpeciesBehavior;
