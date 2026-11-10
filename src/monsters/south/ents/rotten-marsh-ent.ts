import type { CreatureDefinition } from "../../types.ts";
import type { SpeciesBehavior } from "../../behavior.ts";

/** rotten-marsh-ent: ficha da região Sul. */
export const rottenMarshEnt = {
    name: "Ent Apodrecido do Pântano", maxHp: 350, contactDamage: 27, experience: 255,
    nature: "hybrid", special: "spore-cloud", speed: 24, range: 72, interval: 3.1,
    status: "poison", statusSeconds: 6, region: "south", caveThemes: ["marsh"],
    biomes: ["oasis", "ruins"],
    loot: [{ item: "Madeira Encharcada", chance: .80 }, { item: "Cogumelo Luminoso", chance: .50 }, { item: "Seiva Tóxica", chance: .30 }],
} satisfies CreatureDefinition;

/** Passos e abordagem do monstro rotten-marsh-ent, com parâmetros próprios. */
export const rottenMarshEntBehavior = { gait: "lumber", pursuit: "direct", cadence: 0.58, weave: 0 } satisfies SpeciesBehavior;
