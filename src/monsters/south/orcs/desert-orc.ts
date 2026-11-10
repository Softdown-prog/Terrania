import type { CreatureDefinition } from "../../types.ts";
import type { SpeciesBehavior } from "../../behavior.ts";
import { southRareDrop } from "../../rareLoot.ts";

/** desert-orc: ficha da região Sul. */
export const desertOrc = {
    name: "Orc Nômade do Deserto", maxHp: 110, contactDamage: 17, experience: 54,
    nature: "physical", special: "orc-club", speed: 54, range: 28, interval: 1.35,
    status: null, statusSeconds: 0, region: "south", caveThemes: ["desert"],
    biomes: ["ruins", "dunes"],
    loot: [{ item: "Osso Talhado", chance: .55 }, { item: "Bracelete de Couro", chance: .25 }, { item: "Carne Seca", chance: .50 }, { item: "Moedas de Ouro", chance: .40 }, southRareDrop("desert-orc")],
} satisfies CreatureDefinition;

/** Movimento, perseguição e retirada próprios de desert-orc; lidos pelo motor. */
export const desertOrcBehavior = { gait: "stride", pursuit: "rush", cadence: 1.01, weave: 0.09 } satisfies SpeciesBehavior;
