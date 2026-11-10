import type { CreatureDefinition } from "../../types.ts";

/** poison-scout-toad: ficha da região Sul. */
export const poisonScoutToad = {
    name: "Sapo Batedor Venenoso", maxHp: 165, contactDamage: 23, experience: 130,
    nature: "physical", special: "tongue", speed: 70, range: 74, interval: 1.5,
    status: "poison", statusSeconds: 6, region: "south", caveThemes: ["marsh"],
    biomes: ["oasis", "ruins"],
    loot: [{ item: "Glândula de Veneno", chance: .60 }, { item: "Perna de Rã", chance: .65 }, { item: "Mucosa Pantanosa", chance: .40 }],
} satisfies CreatureDefinition;
