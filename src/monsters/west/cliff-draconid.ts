import type { CreatureDefinition } from "../types.ts";

/** cliff-draconid: ficha da região Oeste. */
export const cliffDraconid = {
    name: "Draconato das Escarpas", maxHp: 190, contactDamage: 34, experience: 185,
    nature: "hybrid", special: "fire", speed: 52, range: 155, interval: 2.4,
    status: null, statusSeconds: 0, region: "west", caveThemes: ["basalt"],
    biomes: ["stone-peak", "volcanic"],
    loot: [{ item: "Escama Vulcânica", chance: .45 }, { item: "Carne Fibrosa", chance: .5 }, { item: "Glândula de Brasa", chance: .15 }],
} satisfies CreatureDefinition;
