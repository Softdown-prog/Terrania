import type { CreatureDefinition } from "../../types.ts";
import type { SpeciesBehavior } from "../../behavior.ts";

/** magma-salamander: ficha da região Oeste. */
export const magmaSalamander = {
    name: "Salamandra de Magma", maxHp: 220, contactDamage: 31, experience: 205,
    nature: "hybrid", special: "lava-burst", speed: 53, range: 152, interval: 2.6,
    status: "burn", statusSeconds: 4, region: "west", caveThemes: ["basalt"],
    biomes: ["volcanic", "stone-peak"],
    loot: [{ item: "Escama Incandescente", chance: .55 }, { item: "Carvão Mineral", chance: .75 }, { item: "Núcleo de Brasa", chance: .18 }],
} satisfies CreatureDefinition;

/** Estratégia própria de magma-salamander, sem código de movimento duplicado. */
export const magmaSalamanderBehavior = { gait: "crawl", pursuit: "direct", cadence: 1.26, weave: 0.14 } satisfies SpeciesBehavior;
