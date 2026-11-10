import type { CreatureDefinition } from "../types.ts";

/** mirage-imp: ficha da região Sul. */
export const mirageImp = {
    name: "Diabrete de Miragem", maxHp: 55, contactDamage: 14, experience: 30,
    nature: "magical", special: "mirage-sparks", speed: 58, range: 104, interval: 1.7,
    status: "blind", statusSeconds: 1.25, region: "south", caveThemes: ["desert"],
    biomes: ["dunes", "ruins"],
    loot: [{ item: "Pó Cintilante", chance: .45 }],
} satisfies CreatureDefinition;
