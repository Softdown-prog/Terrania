/**
 * Decoração do deserto do Sul (ADR 0036 e 0037): onde cada peça fica e o que bloqueia. É um sistema próprio, fora
 * de `Tile` (nenhum campo novo nos dados do terreno), e a colisão sai da mesma colocação que a arte desenha.
 */
export type DecorKind = "dry-grass" | "shrub" | "bones" | "cactus" | "cracked-earth";

/** Quantos formatos cada peça tem; a variação escolhe um. */
export const DECOR_VARIANTS = 4;

/** Uma peça no chão: o que é, onde (px dentro do tile) e a variação (0 a 1) que escolhe o formato. */
export interface DecorPlacement {
  readonly kind: DecorKind;
  readonly x: number;
  readonly y: number;
  readonly variation: number;
}
