import { valueNoise } from "../../../../world/random.ts";

/**
 * Relevo contínuo das dunas do Sul (ADR 0033). Função pura da posição (em tiles) e da semente: o mesmo
 * ponto dá a mesma altura em qualquer chunk, então não há costura entre eles. Sem canvas, sem relógio.
 */

/** Direção em que as cristas correm (radianos) e a luz, de noroeste, como no resto do jogo. */
const CREST = 0.42;
const ACROSS_X = -Math.sin(CREST), ACROSS_Y = Math.cos(CREST);
const SECOND = 0.95;
const SECOND_X = -Math.sin(SECOND), SECOND_Y = Math.cos(SECOND);
/** Direção perpendicular às cristas: por ela a altura sobe devagar e cai rápido. */
export const DUNE_ACROSS = { x: ACROSS_X, y: ACROSS_Y } as const;
export const DUNE_LIGHT = { x: -0.62, y: -0.78 } as const;

const smooth = (t: number): number => t * t * (3 - 2 * t);
/** Perfil assimétrico de duna: sobe devagar pelo lado do vento e cai rápido na face de deslizamento. */
function profile(t: number): number {
  const f = t - Math.floor(t);
  return f < 0.72 ? smooth(f / 0.72) : 1 - smooth((f - 0.72) / 0.28);
}

/** Altura do terreno em (tx, ty), de 0 a cerca de 1,1. */
export function duneHeight(tx: number, ty: number, seed: number): number {
  const warp = valueNoise(tx / 11, ty / 11, seed + 301) * 4.2 + valueNoise(tx / 4.5, ty / 4.5, seed + 307) * 1.2;
  const across = tx * ACROSS_X + ty * ACROSS_Y + warp;
  // Dunas grandes, mais altas em alguns trechos e quase planas em outros.
  const big = profile(across / 11) * (0.5 + 0.5 * valueNoise(tx / 23, ty / 23, seed + 311));
  // Dunas menores, noutra direção, quebram a regularidade das grandes.
  const second = profile((tx * SECOND_X + ty * SECOND_Y + warp * 0.6) / 4.3) * 0.26;
  return big + second + (valueNoise(tx / 2.2, ty / 2.2, seed + 313) - 0.5) * 0.1;
}

/** Marcas de vento: ondulações finas (cerca de 16 px, quatro amostras por ciclo) sobre o relevo. */
export function rippleHeight(tx: number, ty: number, seed: number): number {
  const phase = (tx * ACROSS_X + ty * ACROSS_Y) / 0.5 + valueNoise(tx / 3, ty / 3, seed + 317) * 5;
  return Math.sin(phase * Math.PI * 2) * 0.0066;
}
