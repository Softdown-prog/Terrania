import type { CreatureDefinition } from "../../types.ts";

/** coral-crab: ficha da região Leste. */
export const coralCrab = {
    name: "Caranguejo de Coral Gigante", maxHp: 240, contactDamage: 21, experience: 150,
    nature: "physical", special: "reef-stones", speed: 32, range: 122, interval: 2.7,
    status: null, statusSeconds: 0, region: "east", caveThemes: ["coastal"],
    biomes: ["beach", "island"],
    loot: [{ item: "Carne de Siri", chance: .8 }, { item: "Fragmento de Coral", chance: .5 }, { item: "Pérola Marinha", chance: .08 }],
} satisfies CreatureDefinition;
