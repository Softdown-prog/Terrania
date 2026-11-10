import type { CreatureDefinition } from "../../types.ts";
import type { SpeciesBehavior } from "../../behavior.ts";

/** frost-banshee: ficha da região Norte. */
export const frostBanshee = {
    name: "Banshee da Geada", maxHp: 155, contactDamage: 37, experience: 185,
    nature: "magical", special: "spectral-ice", speed: 62, range: 185, interval: 2.6,
    status: "slow", statusSeconds: 3.5, region: "north", caveThemes: ["glacial"],
    biomes: ["snowfield", "frozen-lake"],
    loot: [{ item: "Ectoplasma Congelado", chance: .35 }, { item: "Fragmento de Runa", chance: .12 }],
} satisfies CreatureDefinition;

/** Locomoção, abordagem e eventual recuo definidos por frost-banshee. */
export const frostBansheeBehavior = { gait: "hover", pursuit: "cautious", cadence: 1.17, weave: 0.35 } satisfies SpeciesBehavior;
