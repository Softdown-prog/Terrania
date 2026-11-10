import type { CreatureDefinition } from "../types.ts";

/** horned-viper: ficha da região Sul. */
export const hornedViper = {
    name: "Víbora-de-Chifre Comum", maxHp: 45, contactDamage: 10, experience: 22,
    nature: "physical", special: "weak-venom", speed: 76, range: 23, interval: .98,
    status: "weak-venom", statusSeconds: 4, region: "south", caveThemes: ["desert"],
    biomes: ["dunes", "oasis", "ruins"],
    loot: [{ item: "Presa Pequena", chance: .50 }, { item: "Couro de Cobra", chance: .40 }],
} satisfies CreatureDefinition;
