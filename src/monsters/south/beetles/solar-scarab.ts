import type { CreatureDefinition } from "../../types.ts";
import type { SpeciesBehavior } from "../../behavior.ts";

/** solar-scarab: ficha da região Sul. */
export const solarScarab = {
    name: "Escaravelho Solar", maxHp: 130, contactDamage: 19, experience: 175,
    nature: "magical", special: "solar-burst", speed: 78, range: 27, interval: 1.25,
    status: null, statusSeconds: 0, region: "south", caveThemes: ["desert"],
    biomes: ["dunes", "ruins"],
    loot: [{ item: "Poeira Dourada", chance: 1 }], autoLoot: true,
} satisfies CreatureDefinition;

/** Passos e abordagem do monstro solar-scarab, com parâmetros próprios. */
export const solarScarabBehavior = { gait: "scuttle", pursuit: "rush", cadence: 1.8, weave: 0.24 } satisfies SpeciesBehavior;
