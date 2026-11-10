import type { CreatureDefinition } from "../types.ts";

/** sand-goblin: ficha da região Sul. */
export const sandGoblin = {
    name: "Goblin Saqueador da Areia", maxHp: 65, contactDamage: 11, experience: 29,
    nature: "physical", special: "sand-throw", speed: 77, range: 115, interval: 1.15,
    status: null, statusSeconds: 0, region: "south", caveThemes: ["desert"],
    biomes: ["dunes", "ruins"],
    loot: [{ item: "Moedas de Cobre", chance: .85 }, { item: "Adaga Enferrujada", chance: .15 }, { item: "Retalho de Pano", chance: .60 }],
} satisfies CreatureDefinition;
