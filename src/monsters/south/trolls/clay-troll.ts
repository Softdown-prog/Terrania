import type { CreatureDefinition } from "../../types.ts";
import type { SpeciesBehavior } from "../../behavior.ts";
import { southRareDrop } from "../../rareLoot.ts";

/** clay-troll: ficha da região Sul. */
export const clayTroll = {
    name: "Troll de Barro Seco", maxHp: 145, contactDamage: 15, experience: 65,
    nature: "physical", special: "clay-clod", speed: 30, range: 108, interval: 2.35,
    status: null, statusSeconds: 0, region: "south", caveThemes: ["marsh", "desert"],
    biomes: ["oasis", "ruins"],
    loot: [{ item: "Argila Ressecada", chance: .75 }, { item: "Tora de Madeira Seca", chance: .45 }, { item: "Pedra Bruta", chance: .60 }, southRareDrop("clay-troll")],
} satisfies CreatureDefinition;

/** Movimento, perseguição e retirada próprios de clay-troll; lidos pelo motor. */
export const clayTrollBehavior = { gait: "lumber", pursuit: "direct", cadence: 0.68, weave: 0.07 } satisfies SpeciesBehavior;
