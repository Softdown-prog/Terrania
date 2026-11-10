import type { CreatureDefinition } from "../../types.ts";
import type { SpeciesBehavior } from "../../behavior.ts";

/** tide-hunter-triton: ficha da região Leste. */
export const tideHunterTriton = {
    name: "Tritão Caçador das Marés", maxHp: 250, contactDamage: 36, experience: 245,
    nature: "hybrid", special: "tidal-lightning", speed: 65, range: 181, interval: 2.7,
    status: null, statusSeconds: 0, region: "east", caveThemes: ["coastal"],
    biomes: ["beach", "island"],
    loot: [{ item: "Escama Azulada", chance: .65 }, { item: "Coral Energizado", chance: .30 }, { item: "Tridente das Marés", chance: .04 }],
} satisfies CreatureDefinition;

/** Estratégia própria de tide-hunter-triton, sem código de movimento duplicado. */
export const tideHunterTritonBehavior = { gait: "stride", pursuit: "cautious", cadence: 1.08, weave: 0.11 } satisfies SpeciesBehavior;
