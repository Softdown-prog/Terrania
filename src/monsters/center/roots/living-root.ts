import type { CreatureDefinition } from "../../types.ts";
import type { SpeciesBehavior } from "../../behavior.ts";

/**
 * living-root: ficha do Centro (andares fundos da Masmorra das Raízes, ADR 0094). Elite: um nó de raízes que se arrasta pelo chão e agarra os pés de quem chega perto.
 * A pancada deixa o herói **enraizado** por 2 segundos (não anda, mas ainda luta). O número de cada campo vem de docs/BESTIARIO_CENTRO.md (vida 220, dano 18, 120 de
 * experiência). Só mora na masmorra: não nasce na superfície nem na Gruta das Raízes comum.
 */
export const livingRoot = {
  name: "Raiz-Viva", maxHp: 220, contactDamage: 18, experience: 120,
  nature: "physical", special: "roots", speed: 36, range: 30, interval: 2.6,
  status: "root", statusSeconds: 2, region: "center", caveThemes: ["verdant"],
  biomes: [],
  loot: [{ item: "Seiva Viva", chance: .6 }, { item: "Raiz Retorcida", chance: .4 }],
} satisfies CreatureDefinition;

/** Rasteja devagar, sempre em direção ao herói, sem recuar nem rodear: a raiz não foge. */
export const livingRootBehavior = { gait: "crawl", pursuit: "direct", cadence: .42, weave: 0 } satisfies SpeciesBehavior;
