import type { CreatureDefinition } from "../../types.ts";
import type { SpeciesBehavior } from "../../behavior.ts";

/** mire-hydra: ficha da região Sul. */
export const mireHydra = {
    name: "Hidra de Lodo", maxHp: 210, contactDamage: 22, experience: 175,
    nature: "magical", special: "acid", speed: 30, range: 155, interval: 2.8,
    status: "poison", statusSeconds: 6, region: "south", caveThemes: ["marsh"],
    biomes: ["oasis", "ruins"],
    loot: [{ item: "Gosma Tóxica", chance: .7 }, { item: "Erva do Pântano", chance: .4 }, { item: "Antídoto Natural", chance: .2 }],
} satisfies CreatureDefinition;

/** Passos e abordagem do monstro mire-hydra, com parâmetros próprios. */
export const mireHydraBehavior = { gait: "slither", pursuit: "flank", cadence: 0.94, weave: 0.18 } satisfies SpeciesBehavior;
