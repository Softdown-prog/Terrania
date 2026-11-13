import { valueNoise } from "../../world/random.ts";

/**
 * Relevo contínuo da rocha das cavernas (ADR 0051). Função pura da posição (em tiles do andar) e da semente: o mesmo ponto
 * dá a mesma altura de um tile para o outro, então não há quadriculado. Sem canvas e sem relógio.
 */

/** A luz vem de noroeste, como no resto do jogo. */
export const ROCK_LIGHT = { x: -0.62, y: -0.78 } as const;

const smooth = (t: number): number => t * t * (3 - 2 * t);

/** Camada de rocha sedimentar: sobe devagar e cai rápido, com uma quina marcada onde a camada acaba. */
export function stratum(t: number): number {
  const f = t - Math.floor(t);
  return f < 0.78 ? smooth(f / 0.78) : 1 - (f - 0.78) / 0.22;
}

/** Altura da rocha em (tx, ty), de 0 a cerca de 1. */
export function rockHeight(tx: number, ty: number, seed: number): number {
  const warp = valueNoise(tx / 8, ty / 8, seed + 601) * 3.2;
  const broad = valueNoise(tx / 5.5, ty / 5.5, seed + 603);
  const mid = valueNoise(tx / 2.1, ty / 2.1, seed + 607);
  const grain = valueNoise(tx / 0.7, ty / 0.7, seed + 611);
  const bed = stratum((ty * 0.82 + tx * 0.31 + warp) / 1.7);
  return broad * 0.5 + mid * 0.24 + grain * 0.09 + bed * 0.09;
}
