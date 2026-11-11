/**
 * Decoração do deserto do Sul (ADR 0036): peças só visuais, sem colisão e sem entrar nos dados do mundo.
 * Cada tipo tem o seu pintor; a colocação sai do bioma e da posição.
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
