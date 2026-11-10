import type { CreatureDefinition } from "../types.ts";

/** runic-polar-bear: ficha da região Norte. */
export const runicPolarBear = {
    name: "Urso Polar Rúnico", maxHp: 340, contactDamage: 34, experience: 260,
    nature: "hybrid", special: "rune-bite", speed: 53, range: 28, interval: 1.7,
    status: "freeze", statusSeconds: .9, region: "north", caveThemes: ["glacial"],
    biomes: ["tundra", "snowfield"],
    loot: [{ item: "Pelagem Branca Real", chance: .60 }, { item: "Garra de Cristal", chance: .40 }, { item: "Carne Gorda", chance: .75 }],
} satisfies CreatureDefinition;
