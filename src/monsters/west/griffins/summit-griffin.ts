import type { CreatureDefinition } from "../../types.ts";
import type { SpeciesBehavior } from "../../behavior.ts";

/** summit-griffin: ficha da região Oeste. */
export const summitGriffin = {
    name: "Grifo das Cumeadas", maxHp: 260, contactDamage: 33, experience: 220,
    nature: "physical", special: "gust", speed: 83, range: 112, interval: 2.4,
    status: null, statusSeconds: 0, region: "west", caveThemes: ["basalt"],
    biomes: ["highlands", "stone-peak"],
    loot: [{ item: "Pena Cinzenta Rara", chance: .65 }, { item: "Garra Afiada", chance: .45 }, { item: "Carne de Caça", chance: .70 }],
} satisfies CreatureDefinition;

/** Estratégia própria de summit-griffin, sem código de movimento duplicado. */
export const summitGriffinBehavior = { gait: "flap", pursuit: "rush", cadence: 1.49, weave: 0.12 } satisfies SpeciesBehavior;
