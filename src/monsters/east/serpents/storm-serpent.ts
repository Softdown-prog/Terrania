import type { CreatureDefinition } from "../../types.ts";

/** storm-serpent: ficha da região Leste. */
export const stormSerpent = {
    name: "Serpente Abissal da Tempestade", maxHp: 290, contactDamage: 38, experience: 270,
    nature: "magical", special: "lightning", speed: 67, range: 205, interval: 2.7,
    status: null, statusSeconds: 0, region: "east", caveThemes: ["coastal"],
    biomes: ["island", "beach"],
    loot: [{ item: "Escama Condutora", chance: .4 }, { item: "Orbe da Tempestade", chance: .12 }, { item: "Espada de Coral Rara", chance: .03 }],
} satisfies CreatureDefinition;
