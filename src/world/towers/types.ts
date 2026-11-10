import type { WorldRegion } from "../regions.ts";

/** Torres que existem no mundo. Cada uma tem o seu arquivo na pasta da sua região. */
export type TowerId = "vigia-caida" | "miragem" | "sol-negro";

/** Bloco sólido no chão: centro (x, y) em pixels a partir do ponto de contato (centro da frente); y negativo é o fundo. */
export interface TowerBlock {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Ficha de uma torre: nome, andares, quanto aparece, onde bloqueia e onde fica a porta. Só dados. */
export interface TowerDefinition {
  readonly id: TowerId;
  readonly name: string;
  readonly region: WorldRegion;
  /** Andares por dentro (o interior vem na fatia seguinte; já é dado de mundo). */
  readonly floors: 2 | 3;
  /** Peso no sorteio entre as torres da região. */
  readonly weight: number;
  /** Onde a torre bloqueia a passagem. A frente (a porta) fica livre. */
  readonly blocks: readonly TowerBlock[];
  /** Onde o herói para para tocar a porta: à frente da base, no chão livre. */
  readonly door: { readonly x: number; readonly y: number };
}
