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

/** O troll regenera um ponto por segundo após quatro segundos sem sofrer dano,
 * desde que o jogador esteja a mais de 120 px. O relógio é acumulado no motor,
 * sem timers, relógio real ou regras de Canvas. */
export function clayTrollRegeneration(hp:number,maxHp:number,quietSeconds:number,
  targetDistance:number,accumulatedSeconds:number,dt:number):{hp:number;elapsed:number} {
  if(!(hp>0&&hp<maxHp&&quietSeconds>4&&targetDistance>120))
    return {hp,elapsed:accumulatedSeconds};
  let elapsed=accumulatedSeconds+dt;
  while(elapsed>=1&&hp<maxHp){
    hp+=1;
    elapsed-=1;
  }
  return {hp,elapsed};
}
