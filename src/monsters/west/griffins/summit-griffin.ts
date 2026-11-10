import type { CreatureDefinition } from "../../types.ts";

/** summit-griffin: ficha da região Oeste. */
export const summitGriffin = {
    name: "Grifo das Cumeadas", maxHp: 260, contactDamage: 33, experience: 220,
    nature: "physical", special: "gust", speed: 83, range: 112, interval: 2.4,
    status: null, statusSeconds: 0, region: "west", caveThemes: ["basalt"],
    biomes: ["highlands", "stone-peak"],
    loot: [{ item: "Pena Cinzenta Rara", chance: .65 }, { item: "Garra Afiada", chance: .45 }, { item: "Carne de Caça", chance: .70 }],
} satisfies CreatureDefinition;
