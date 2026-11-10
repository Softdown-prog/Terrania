import type { CreatureDefinition } from "../types.ts";

/** frost-spirit: ficha da região Norte. */
export const frostSpirit = {
    name: "Espírito da Geada", maxHp: 160, contactDamage: 32, experience: 150,
    nature: "magical", special: "ice-shards", speed: 63, range: 185, interval: 2.5,
    status: "attack-slow", statusSeconds: 3, region: "north", caveThemes: ["glacial"],
    biomes: ["snowfield", "frozen-lake"],
    loot: [{ item: "Essência de Gelo", chance: .5 }, { item: "Cristal Boreal", chance: .2 }],
} satisfies CreatureDefinition;
