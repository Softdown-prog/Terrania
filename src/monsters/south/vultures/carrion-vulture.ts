import type { CreatureDefinition } from "../../types.ts";
import type { SpeciesBehavior } from "../../behavior.ts";

/** carrion-vulture: ficha da região Sul. */
export const carrionVulture = {
    name: "Abutre Carniceiro do Sul", maxHp: 50, contactDamage: 9, experience: 24,
    nature: "physical", special: "carrion-dive", speed: 83, range: 26, interval: 1.12,
    status: null, statusSeconds: 0, region: "south", caveThemes: ["desert"],
    biomes: ["dunes", "ruins"],
    loot: [{ item: "Pena Escura", chance: .70 }, { item: "Carne Fibrosa", chance: .30 }],
} satisfies CreatureDefinition;

/** Comportamento de carrion-vulture: ritmo, perseguição e distância de recuo. */
export const carrionVultureBehavior = { gait: "hop", pursuit: "cautious", cadence: 1.15, weave: 0.09, retreatAt: 0.25 } satisfies SpeciesBehavior;
