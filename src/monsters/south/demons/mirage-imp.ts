import type { CreatureDefinition } from "../../types.ts";
import type { SpeciesBehavior } from "../../behavior.ts";
import { southRareDrop } from "../../rareLoot.ts";

/** mirage-imp: ficha da região Sul. */
export const mirageImp = {
    name: "Diabrete de Miragem", maxHp: 55, contactDamage: 14, experience: 30,
    nature: "magical", special: "mirage-sparks", speed: 58, range: 104, interval: 1.7,
    status: "blind", statusSeconds: 1.25, region: "south", caveThemes: ["desert"],
    biomes: ["dunes", "ruins"],
    loot: [{ item: "Pó Cintilante", chance: .45 }, southRareDrop("mirage-imp")],
} satisfies CreatureDefinition;

/** Comportamento de mirage-imp: ritmo, perseguição e distância de recuo. */
export const mirageImpBehavior = { gait: "float", pursuit: "flank", cadence: 1.85, weave: 0.3 } satisfies SpeciesBehavior;
