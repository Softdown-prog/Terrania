import type { CreatureDefinition } from "../types.ts";

/** abyssal-octopus: ficha da região Leste. */
export const abyssalOctopus = {
    name: "Polvo Abissal dos Recifes", maxHp: 275, contactDamage: 29, experience: 220,
    nature: "hybrid", special: "ink", speed: 37, range: 138, interval: 2.6,
    status: "blind", statusSeconds: 4, region: "east", caveThemes: ["coastal"],
    biomes: ["beach", "island"],
    loot: [{ item: "Tentáculo Fresco", chance: .70 }, { item: "Bolsa de Tinta Abissal", chance: .50 }, { item: "Moedas Antigas", chance: .45 }],
} satisfies CreatureDefinition;
