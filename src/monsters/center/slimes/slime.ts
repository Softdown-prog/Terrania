import type { CreatureDefinition } from "../../types.ts";

/** slime: ficha da região Centro. */
export const slime = {
    name: "Slime", maxHp: 2, contactDamage: 9, experience: 10,
    nature: "physical", special: "none", speed: 38, range: 24, interval: 1.2,
    status: null, statusSeconds: 0, region: "center", caveThemes: ["verdant"],
    biomes: ["meadow", "woodland", "trail"], loot: [{ item: "gel", chance: 1 }],
} satisfies CreatureDefinition;
