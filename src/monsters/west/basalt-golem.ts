import type { CreatureDefinition } from "../types.ts";

/** basalt-golem: ficha da região Oeste. */
export const basaltGolem = {
    name: "Golem de Basalto", maxHp: 320, contactDamage: 28, experience: 240,
    nature: "physical", special: "boulder", speed: 27, range: 165, interval: 3.2,
    status: "slow", statusSeconds: 2.5, region: "west", caveThemes: ["basalt"],
    biomes: ["highlands", "stone-peak", "volcanic"],
    loot: [{ item: "Minério de Ferro Bruto", chance: .6 }, { item: "Núcleo de Rocha", chance: .2 }, { item: "Moedas de Ouro", chance: .8 }],
} satisfies CreatureDefinition;
