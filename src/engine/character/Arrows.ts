import { IRON_ARROW } from "./weapons/arrows/iron.ts";
import { REED_ARROW } from "./weapons/arrows/reed.ts";

/**
 * Os tipos de flecha do Arqueiro, a munição (ADR 0110, lista em `docs/ARQUEIRO.md`). Junco (comum) e Ferro (mais forte e mais cara, ADR 0117); Pena de Corvo,
 * Fogo, Veneno, Gelo, Raio e Estelar entram em lotes seguintes.
 */
export const ARROW_IDS = ["reed", "iron"] as const;
export type ArrowId = typeof ARROW_IDS[number];
export const DEFAULT_ARROW: ArrowId = "reed";
/** O máximo de flechas de cada tipo na aljava (decisão do dono em `ARQUEIRO.md`). */
export const MAX_ARROWS = 99;
/** Quantas flechas a Irmandade vende de cada vez (ADR 0117); com a aljava quase cheia, só o que cabe. */
export const ARROW_PACK = 10;

export interface ArrowDefinition {
  readonly name: string;
  /** Dano somado ao do arco em cada tiro com esta flecha. */
  readonly bonusDamage: number;
  /** Preço de cada flecha, em Terrania Gold, na Irmandade dos Arqueiros (ADR 0117). */
  readonly price: number;
}
export const ARROWS: Readonly<Record<ArrowId, ArrowDefinition>> = { reed: REED_ARROW, iron: IRON_ARROW };

export function isArrowId(value: unknown): value is ArrowId {
  return typeof value === "string" && ARROW_IDS.some(id => id === value);
}
