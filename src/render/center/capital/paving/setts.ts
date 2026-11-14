import { TILE_SIZE } from "../../../../world/terrain.ts";
import { paveNoise, type PavingKind, TONES } from "./palette.ts";

/** As pedras das ruas (16 × 8 px, quatro fiadas por tile) e as lajes da praça (32 × 16 px, duas fiadas por tile). */
export const SIZES: Readonly<Record<PavingKind, { readonly w: number; readonly h: number }>> = { street: { w: 16, h: 8 }, plaza: { w: 32, h: 16 } };

/** Uma pedra (já cortada pelo tile) em pixels locais do tile, com quais bordas dela são bordas reais. */
export interface Sett {
  readonly x: number; readonly y: number; readonly w: number; readonly h: number;
  /** Tom da pedra (índice em `TONES`), igual nos dois tiles que dividem a pedra. */
  readonly tone: number;
  readonly left: boolean; readonly top: boolean; readonly right: boolean; readonly bottom: boolean;
  /** Sorteio 0..1 da pedra inteira (nível de luz, rachadura). */
  readonly roll: number;
}

/**
 * As pedras do tile (tx, ty): fiadas de altura fixa e global (a fiada vem da posição no mundo, não do tile), cada fiada com as
 * pedras meia pedra deslocadas da vizinha. O tom e o sorteio saem da posição global da pedra, então uma pedra que atravessa a
 * emenda de dois tiles sai igual nos dois (sem quadriculado). Função pura.
 */
export function capitalSetts(tx: number, ty: number, seed: number, plaza: boolean): Sett[] {
  if (![tx, ty, seed].every(Number.isSafeInteger)) return [];
  const kind: PavingKind = plaza ? "plaza" : "street", { w, h } = SIZES[kind], rows = TILE_SIZE / h, tones = TONES[kind].length;
  const X0 = tx * TILE_SIZE, X1 = X0 + TILE_SIZE, out: Sett[] = [];
  for (let r = 0; r < rows; r++) {
    const row = ty * rows + r, offset = row % 2 === 0 ? 0 : w / 2;
    for (let k = Math.floor((X0 - offset) / w); k * w + offset < X1; k++) {
      const a = k * w + offset, b = a + w, lo = Math.max(a, X0), hi = Math.min(b, X1);
      out.push({ x: lo - X0, y: r * h, w: hi - lo, h, tone: Math.floor(paveNoise(k, row, seed + 41) * tones) % tones,
        left: a >= X0, top: true, right: b <= X1, bottom: true, roll: paveNoise(k, row, seed + 43) });
    }
  }
  return out;
}
