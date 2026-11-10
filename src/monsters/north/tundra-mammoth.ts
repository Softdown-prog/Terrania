import type { CreatureDefinition } from "../types.ts";

/** tundra-mammoth: ficha da região Norte. */
export const tundraMammoth = {
    name: "Mamute Blindado da Tundra", maxHp: 450, contactDamage: 40, experience: 340,
    nature: "physical", special: "trample", speed: 32, range: 46, interval: 2.9,
    status: "stun", statusSeconds: .75, region: "north", caveThemes: ["glacial"],
    biomes: ["tundra", "snowfield"],
    loot: [{ item: "Marfim Glacial", chance: .30 }, { item: "Couro Pesado", chance: .85 }, { item: "Carne Nobre", chance: .90 }],
} satisfies CreatureDefinition;
