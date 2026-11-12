/** Cor RGB 0..255. */
export type Rgb = readonly [number, number, number];

/**
 * Cores do lago negro (ADR 0039). A água vai do raso turvo ao fundo de tinta (as mesmas três cores que o lago já
 * usava), a margem tem lama molhada, escura junto da água, e a borda tem um fio claro arroxeado.
 */
export const SHALLOW: Rgb = [0x2b, 0x3b, 0x3d];
export const MID: Rgb = [0x17, 0x21, 0x2b];
export const DEEP: Rgb = [0x0d, 0x12, 0x1a];
export const MUD_WET: Rgb = [0x2e, 0x24, 0x1c];
export const MUD_DRY: Rgb = [0x5a, 0x46, 0x34];
export const RIM: Rgb = [0x7a, 0x6c, 0x9e];

export const lerpColor = (a: Rgb, b: Rgb, t: number): Rgb => {
  const k = Math.max(0, Math.min(1, t));
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
};

/** Cor da água para uma profundidade de 0 (raso) a 1 (fundo): raso → meio em 35 %, meio → fundo no resto. */
export function waterColor(depth: number): Rgb {
  const d = Math.max(0, Math.min(1, Number.isFinite(depth) ? depth : 0));
  return d < 0.35 ? lerpColor(SHALLOW, MID, d / 0.35) : lerpColor(MID, DEEP, (d - 0.35) / 0.65);
}
