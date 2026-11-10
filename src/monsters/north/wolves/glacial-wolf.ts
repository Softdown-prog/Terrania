import type { CreatureDefinition } from "../../types.ts";
import type { SpeciesBehavior } from "../../behavior.ts";

/** glacial-wolf: ficha da região Norte. */
export const glacialWolf = {
    name: "Lobo de Cristal Glacial", maxHp: 140, contactDamage: 25, experience: 110,
    nature: "physical", special: "frost-bite", speed: 98, range: 26, interval: .92,
    status: null, statusSeconds: 0, region: "north", caveThemes: ["glacial"],
    biomes: ["tundra", "snowfield", "frozen-lake"],
    loot: [{ item: "Presa Afiada", chance: .6 }, { item: "Couro Ártico", chance: .45 }],
} satisfies CreatureDefinition;

/** Locomoção e recuo por espécie: glacial-wolf. */
export const glacialWolfBehavior = { gait: "gallop", pursuit: "rush", cadence: 1.92, weave: 0.12 } satisfies SpeciesBehavior;
