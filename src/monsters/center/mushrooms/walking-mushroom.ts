import type { CreatureDefinition } from "../../types.ts";
import type { SpeciesBehavior } from "../../behavior.ts";

/**
 * walking-mushroom: ficha do Centro. Lento, fica a distância e sopra uma nuvem de esporos que deixa o herói lento (mesmo mecanismo de ataque à distância do
 * Ent do Pântano). Números de docs/BESTIARIO_CENTRO.md (vida 100, dano 11, 48 de experiência). Mora nas matas e na Gruta das Raízes.
 */
export const walkingMushroom = {
  name: "Cogumelo Andante", maxHp: 100, contactDamage: 11, experience: 48,
  nature: "magical", special: "spore-cloud", speed: 30, range: 72, interval: 3,
  status: "slow", statusSeconds: 3, region: "center", caveThemes: ["verdant"],
  biomes: ["woodland"],
  loot: [{ item: "Esporos de Cogumelo", chance: .6 }, { item: "Chapéu de Cogumelo", chance: .3 }],
} satisfies CreatureDefinition;

/** Anda aos pulinhos e com cautela, sem se aproximar além do alcance do sopro. */
export const walkingMushroomBehavior = { gait: "hop", pursuit: "cautious", cadence: .7, weave: .12 } satisfies SpeciesBehavior;
