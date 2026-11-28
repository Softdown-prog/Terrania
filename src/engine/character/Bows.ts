import { HUNTING_BOW } from "./weapons/bows/hunting.ts";

/**
 * Catálogo dos arcos do Arqueiro (ADR 0110, lista em `docs/ARQUEIRO.md`). Os onze espelham as espadas; por ora só o Arco de Caça existe, e os outros
 * dez entram em lotes (A4). Só dados, sem Canvas: o desenho dos arcos vem no lote A2.
 */
export const BOW_IDS = ["hunting"] as const;
export type BowId = typeof BOW_IDS[number];
export const DEFAULT_BOW: BowId = "hunting";

export interface BowDefinition {
  readonly name: string;
  /** O nível que libera o arco (o do arco de caça é 0: o Arqueiro já nasce com ele). */
  readonly level: number;
  /** Dano da flecha, antes da defesa do alvo. */
  readonly damage: number;
  /** Segundos entre um tiro e o próximo. */
  readonly interval: number;
  /** Segundos de preparo até a flecha sair. */
  readonly windup: number;
  /** Alcance do tiro, em tiles. */
  readonly range: number;
  /** Flechas gastas por tiro. */
  readonly arrowsPerShot: number;
  /** De que é feito, para o desenho (lote A2). */
  readonly material: string;
}

export const BOWS: Readonly<Record<BowId, BowDefinition>> = { hunting: HUNTING_BOW };

export function isBowId(value: unknown): value is BowId {
  return typeof value === "string" && BOW_IDS.some(id => id === value);
}
/** O Arqueiro usa o arco se o nível dele alcança o do arco. */
export const bowUnlocked = (bow: BowId, level: number): boolean => Number.isInteger(level) && level >= BOWS[bow].level;
