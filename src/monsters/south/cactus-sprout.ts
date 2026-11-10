import type { CreatureDefinition } from "../types.ts";

/** cactus-sprout: ficha da região Sul. */
export const cactusSprout = {
    name: "Brotinho de Cacto Animado", maxHp: 60, contactDamage: 8, experience: 25,
    nature: "magical", special: "thorns", speed: 38, range: 25, interval: 1.55,
    status: null, statusSeconds: 0, region: "south", caveThemes: ["desert"],
    biomes: ["dunes", "ruins", "oasis"],
    loot: [{ item: "Flor do Deserto", chance: .40 }, { item: "Polpa de Cacto Hidratante", chance: .65 }, { item: "Espinho Verde", chance: .55 }],
} satisfies CreatureDefinition;
