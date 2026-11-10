import type { CreatureDefinition } from "../types.ts";

/** boreal-yeti: ficha da região Norte. */
export const borealYeti = {
    name: "Yeti Boreal", maxHp: 380, contactDamage: 36, experience: 280,
    nature: "physical", special: "snowball", speed: 34, range: 165, interval: 3.4,
    status: "freeze", statusSeconds: 1.3, region: "north", caveThemes: ["glacial"],
    biomes: ["tundra", "snowfield"],
    loot: [{ item: "Pelagem Espessa", chance: .65 }, { item: "Carne Congelada", chance: .75 }, { item: "Clava de Osso", chance: .1 }],
} satisfies CreatureDefinition;
