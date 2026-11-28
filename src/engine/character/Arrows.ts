import { REED_ARROW } from "./weapons/arrows/reed.ts";

/**
 * Os tipos de flecha do Arqueiro, a munição (ADR 0110, lista em `docs/ARQUEIRO.md`). Por ora só a de Junco; Ferro, Pena de Corvo, Fogo, Veneno,
 * Gelo, Raio e Estelar entram no lote A3.
 */
export const ARROW_IDS = ["reed"] as const;
export type ArrowId = typeof ARROW_IDS[number];
export const DEFAULT_ARROW: ArrowId = "reed";
/** O máximo de flechas de cada tipo na aljava (decisão do dono em `ARQUEIRO.md`). */
export const MAX_ARROWS = 99;

export interface ArrowDefinition {
  readonly name: string;
  /** Dano somado ao do arco em cada tiro com esta flecha. */
  readonly bonusDamage: number;
}
export const ARROWS: Readonly<Record<ArrowId, ArrowDefinition>> = { reed: REED_ARROW };

export function isArrowId(value: unknown): value is ArrowId {
  return typeof value === "string" && ARROW_IDS.some(id => id === value);
}
