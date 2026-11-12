import { TILE_SIZE } from "../../../../world/terrain.ts";
import { paveNoise } from "./palette.ts";

/** Três fiadas por tile, em alturas fixas e globais: a fiada vem da posição no mundo, não do tile. */
export const COURSES_PER_TILE = 3;
export const COURSE_HEIGHT = TILE_SIZE / COURSES_PER_TILE;
/** Largura média de uma laje e o quanto a junta pode se afastar do lugar regular. */
export const SLAB_WIDTH = 15;
export const JOINT_JITTER = 4;
const SLAB_TONE_COUNT = 4;

/** Uma laje (já cortada pelo tile) em pixels locais do tile, com quais bordas dela são bordas reais. */
export interface Slab {
  readonly x: number; readonly y: number; readonly w: number; readonly h: number;
  /** Tom da pedra (índice em `SLAB_TONES`), igual nos dois tiles que dividem a laje. */
  readonly tone: number;
  readonly left: boolean; readonly top: boolean; readonly right: boolean; readonly bottom: boolean;
  /** Centro da laje inteira em pixels do mundo (para saber se está sobre um anel). */
  readonly worldX: number; readonly worldY: number;
  /** Sorteio 0..1 da laje inteira (rachaduras, mancha de desgaste). */
  readonly roll: number;
}

/** Posição global (px) da junta `k` na fiada `course`: fiadas alternadas ficam meia laje deslocadas. */
export function slabJoint(course: number, k: number, seed: number): number {
  return k * SLAB_WIDTH + (course % 2 === 0 ? 0 : SLAB_WIDTH / 2) + (paveNoise(course, k, seed + 31) - 0.5) * 2 * JOINT_JITTER;
}

/**
 * As lajes do tile (tx, ty). Cada fiada é uma sequência de lajes que cobre o tile de ponta a ponta; as juntas e os tons
 * saem de funções globais, então uma laje que atravessa a emenda de dois tiles sai igual nos dois (sem quadriculado).
 */
export function pavingSlabs(tx: number, ty: number, seed: number): Slab[] {
  if (![tx, ty, seed].every(Number.isSafeInteger)) return [];
  const X0 = tx * TILE_SIZE, X1 = X0 + TILE_SIZE, out: Slab[] = [];
  for (let row = 0; row < COURSES_PER_TILE; row++) {
    const course = ty * COURSES_PER_TILE + row, y = row * COURSE_HEIGHT;
    let k = Math.floor((X0 - SLAB_WIDTH * 2) / SLAB_WIDTH);
    while (slabJoint(course, k + 1, seed) <= X0) k++;
    for (; slabJoint(course, k, seed) < X1; k++) {
      const a = slabJoint(course, k, seed), b = slabJoint(course, k + 1, seed);
      const lo = Math.max(a, X0), hi = Math.min(b, X1);
      out.push({
        x: lo - X0, y, w: hi - lo, h: COURSE_HEIGHT,
        tone: Math.min(SLAB_TONE_COUNT - 1, Math.floor(paveNoise(course, k, seed + 37) * SLAB_TONE_COUNT)),
        left: a >= X0, top: true, right: b <= X1, bottom: true,
        worldX: (a + b) / 2, worldY: ty * TILE_SIZE + y + COURSE_HEIGHT / 2,
        roll: paveNoise(course, k, seed + 41),
      });
    }
  }
  return out;
}
