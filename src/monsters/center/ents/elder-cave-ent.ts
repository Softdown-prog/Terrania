import type { CreatureDefinition } from "../../types.ts";
import type { SpeciesBehavior } from "../../behavior.ts";

/**
 * elder-cave-ent: ficha do Centro, chefe da Masmorra das Raízes (ADR 0094). O Ent Ancião da Gruta: uma árvore velha de coração aceso que pisa o chão e solta raízes em
 * área (alcance 90): as raízes prendem o herói por 2,5 segundos e o pisão, de perto, ainda o atordoa. Vida 650, dano 28, 450 de experiência (docs/BESTIARIO_CENTRO.md);
 * deixa o baú do chefe e o Coração de Madeira. Só mora no último andar.
 */
export const elderCaveEnt = {
  name: "Ent Ancião da Gruta", maxHp: 650, contactDamage: 28, experience: 450,
  nature: "physical", special: "root-quake", speed: 20, range: 90, interval: 3.4,
  status: "root", statusSeconds: 2.5, region: "center", caveThemes: ["verdant"],
  biomes: [],
  loot: [{ item: "Coração de Madeira", chance: .7 }, { item: "Madeira Antiga", chance: .9 }, { item: "Seiva Viva", chance: .5 }],
} satisfies CreatureDefinition;

/** Anda a passos pesados e diretos para o herói, devagar como uma árvore, e luta até cair. */
export const elderCaveEntBehavior = { gait: "lumber", pursuit: "direct", cadence: .44, weave: 0 } satisfies SpeciesBehavior;
