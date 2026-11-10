import type { CreatureDefinition } from "../../types.ts";
import type { SpeciesBehavior } from "../../behavior.ts";

/** cliff-draconid: ficha da região Oeste. */
export const cliffDraconid = {
    name: "Draconato das Escarpas", maxHp: 190, contactDamage: 34, experience: 185,
    nature: "hybrid", special: "fire", speed: 52, range: 155, interval: 2.4,
    status: null, statusSeconds: 0, region: "west", caveThemes: ["basalt"],
    biomes: ["stone-peak", "volcanic"],
    loot: [{ item: "Escama Vulcânica", chance: .45 }, { item: "Carne Fibrosa", chance: .5 }, { item: "Glândula de Brasa", chance: .15 }],
} satisfies CreatureDefinition;

/** Estratégia própria de cliff-draconid, sem código de movimento duplicado. */
export const cliffDraconidBehavior = { gait: "stride", pursuit: "rush", cadence: 1.22, weave: 0.08 } satisfies SpeciesBehavior;
