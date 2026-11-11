/** Cores compartilhadas da decoração do deserto (ADR 0036): contorno e reflexo do contrato de arte e os tons de areia. */
export const DECOR_OUTLINE = "#2b1a0e";
export const DECOR_GLINT = "#fff6dc";
export const DECOR_SAND = { shade: "#a67a45", mid: "#d2ac6a", light: "#ecd49c", drift: "#e9d6a4" } as const;

/** Formato 0 a 3 sempre válido, a partir de qualquer número (inclusive NaN ou fora de faixa). */
export function decorShape(variant: number, count = 4): number {
  return Math.max(0, Math.min(count - 1, Math.floor(Number.isFinite(variant) ? variant : 0)));
}
