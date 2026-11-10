import type { CreatureDefinition } from "../../types.ts";
import type { SpeciesBehavior } from "../../behavior.ts";
import { southRareDrop } from "../../rareLoot.ts";

/** carrion-sandworm: ficha da região Sul. */
export const carrionSandworm = {
    name: "Verme da Areia Carniceiro", maxHp: 310, contactDamage: 35, experience: 245,
    nature: "physical", special: "burrow", speed: 39, range: 128, interval: 3.1,
    status: null, statusSeconds: 0, region: "south", caveThemes: ["desert"],
    biomes: ["dunes", "ruins"],
    loot: [{ item: "Placa Quitinosa", chance: .60 }, { item: "Dente de Verme", chance: .35 }, { item: "Quartzo Bruto", chance: .25 }, southRareDrop("carrion-sandworm")],
} satisfies CreatureDefinition;

/** Locomoção e recuo por espécie: carrion-sandworm. */
export const carrionSandwormBehavior = { gait: "burrow", pursuit: "rush", cadence: 1.02, weave: 0.15 } satisfies SpeciesBehavior;
