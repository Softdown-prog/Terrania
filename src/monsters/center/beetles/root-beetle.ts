import type { CreatureDefinition } from "../../types.ts";
import type { SpeciesBehavior } from "../../behavior.ts";

/**
 * root-beetle: ficha do Centro (Gruta das Raízes). Tanque do começo do jogo: a casca dura corta o dano de cada golpe em 1 (`ROOT_BEETLE_SHELL`, aplicado em
 * `RegionalMonster.defense`). Números de docs/BESTIARIO_CENTRO.md (vida 55, dano 6, 17 de experiência).
 */
export const rootBeetle = {
  name: "Besouro de Raiz", maxHp: 55, contactDamage: 6, experience: 17,
  nature: "physical", special: "none", speed: 52, range: 22, interval: 1.1,
  status: null, statusSeconds: 0, region: "center", caveThemes: ["verdant"],
  biomes: ["meadow", "woodland"],
  loot: [{ item: "Carapaça de Raiz", chance: .5 }, { item: "Seiva Escura", chance: .2 }],
} satisfies CreatureDefinition;

/** A defesa extra da casca dura: cada golpe do herói perde 1 de dano. */
export const ROOT_BEETLE_SHELL = 1;

/** Anda pesado e em linha reta, sem nenhuma pressa. */
export const rootBeetleBehavior = { gait: "lumber", pursuit: "direct", cadence: .9, weave: .05 } satisfies SpeciesBehavior;
