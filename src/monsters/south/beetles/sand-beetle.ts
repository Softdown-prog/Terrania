import type { CreatureDefinition } from "../../types.ts";
import { southRareDrop } from "../../rareLoot.ts";

/** Besouro da Areia: habitante de superfície do Sul, níveis 5–18. */
export const sandBeetle = {
    name: "Besouro da Areia", maxHp: 40, contactDamage: 7, experience: 18,
    nature: "physical", special: "none", speed: 62, range: 22, interval: 1.05,
    status: null, statusSeconds: 0, region: "south", caveThemes: [],
    biomes: ["dunes", "ruins", "trail"], recommendedLevels: [5, 18],
    loot: [{ item: "Carapaça Seca", chance: .4 }, southRareDrop("sand-beetle")],
} satisfies CreatureDefinition;
