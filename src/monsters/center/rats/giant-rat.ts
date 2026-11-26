import type { CreatureDefinition } from "../../types.ts";
import type { SpeciesBehavior } from "../../behavior.ts";

/**
 * giant-rat: ficha do Centro (Gruta das Raízes). Criatura de começo de jogo: fraca, rápida e de mordida simples, sem efeito. O número de cada campo vem de
 * docs/BESTIARIO_CENTRO.md (vida 28, dano 5, 9 de experiência).
 */
export const giantRat = {
  name: "Rato Gigante", maxHp: 28, contactDamage: 5, experience: 9,
  nature: "physical", special: "none", speed: 88, range: 24, interval: .7,
  status: null, statusSeconds: 0, region: "center", caveThemes: ["verdant"],
  biomes: ["meadow", "woodland", "trail"],
  loot: [{ item: "Rabo de Rato Gigante", chance: .55 }, { item: "Dente de Roedor", chance: .3 }],
} satisfies CreatureDefinition;

/** Corre aos arrancos e ronda o herói antes de morder; o bando de ratos nunca vai em linha reta. */
export const giantRatBehavior = { gait: "skitter", pursuit: "flank", cadence: 2.3, weave: .22 } satisfies SpeciesBehavior;
