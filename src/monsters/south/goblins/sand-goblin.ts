import type { CreatureDefinition } from "../../types.ts";
import type { SpeciesBehavior } from "../../behavior.ts";
import { southRareDrop } from "../../rareLoot.ts";

/** sand-goblin: ficha da região Sul. */
export const sandGoblin = {
    name: "Goblin Saqueador da Areia", maxHp: 65, contactDamage: 11, experience: 29,
    nature: "physical", special: "sand-throw", speed: 77, range: 115, interval: 1.15,
    status: null, statusSeconds: 0, region: "south", caveThemes: ["desert"],
    biomes: ["dunes", "ruins"],
    loot: [{ item: "Moedas de Cobre", chance: .85 }, { item: "Adaga Enferrujada", chance: .15 }, { item: "Retalho de Pano", chance: .60 }, southRareDrop("sand-goblin")],
} satisfies CreatureDefinition;

/** Movimento, perseguição e retirada próprios de sand-goblin; lidos pelo motor. */
export const sandGoblinBehavior = { gait: "skitter", pursuit: "flank", cadence: 1.57, weave: 0.23, retreatAt: 0.25 } satisfies SpeciesBehavior;

/** Ao perder 65% do HP, o goblin joga areia e tenta manter distância. 
 * O motor verifica alcance, visão e recarga; esta regra é só desta espécie. */
export function sandGoblinCornered(hp:number,maxHp:number):boolean {
  return hp<=maxHp*.35;
}
