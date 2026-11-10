import type { CreatureDefinition } from "../types.ts";
import { southRareDrop } from "../rareLoot.ts";

/** oasis-elf: ficha da região Sul. */
export const oasisElf = {
    name: "Elfo Patrulheiro do Oásis", maxHp: 90, contactDamage: 16, experience: 45,
    nature: "hybrid", special: "sun-spear", speed: 64, range: 29, interval: 1.25,
    status: null, statusSeconds: 0, region: "south", caveThemes: ["desert"],
    biomes: ["oasis", "ruins"],
    loot: [{ item: "Tecido de Linho Fino", chance: .50 }, { item: "Tâmara do Oásis", chance: .60 }, { item: "Ponta de Lança Élfica", chance: .18 }, southRareDrop("oasis-elf")],
} satisfies CreatureDefinition;
