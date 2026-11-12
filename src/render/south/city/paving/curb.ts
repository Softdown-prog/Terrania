import { TILE_SIZE } from "../../../../world/terrain.ts";
import { CURB_TONES, SAND, SLAB_DARK, paveNoise } from "./palette.ts";

/** Lados do tile em que o vizinho NÃO é piso (no piso: há meio-fio; na areia: o vizinho é piso e dá sombra). */
export interface PavedEdges { readonly n: boolean; readonly e: boolean; readonly s: boolean; readonly w: boolean }
export const NO_EDGES: PavedEdges = { n: false, e: false, s: false, w: false };
/** Espessura do meio-fio e largura média de cada pedra dele, em pixels. */
export const CURB_THICKNESS = 5;
export const CURB_STONE = 11;
const SHADE_WIDTH = 7;

/** Posições globais das juntas do meio-fio numa faixa (`lane` é a linha ou coluna do mundo onde ele corre). */
export function curbJoints(from: number, to: number, lane: number, seed: number): number[] {
  const out: number[] = [];
  for (let k = Math.floor(from / CURB_STONE) - 1; k * CURB_STONE < to + CURB_STONE; k++)
    out.push(k * CURB_STONE + (paveNoise(k, lane, seed + 53) - 0.5) * 4);
  return out;
}

/**
 * Meio-fio das ruas da cidade (ADR 0042): pedras mais claras e maiores na borda do piso que encosta na areia, com
 * a areia invadindo por cima aqui e ali, e a sombra suave que o piso lança do lado da areia. As juntas vêm de
 * funções globais: a mesma pedra sai igual quando atravessa a emenda de dois tiles.
 */
export class CityCurb {
  private readonly c: CanvasRenderingContext2D;
  constructor(c: CanvasRenderingContext2D) { this.c = c; }

  /** Pinta o meio-fio dos lados marcados do tile cuja origem no canvas é (x, y) e que fica em (tx, ty) no mundo. */
  stones(x: number, y: number, tx: number, ty: number, edges: PavedEdges, seed: number): void {
    const c = this.c, T = TILE_SIZE, K = CURB_THICKNESS;
    const lanes: Array<[boolean, boolean, number, number]> = [
      // [lado marcado, horizontal?, linha/coluna no mundo, deslocamento da faixa no tile]
      [edges.n, true, ty, 0], [edges.s, true, ty + 1, T - K], [edges.w, false, tx, 0], [edges.e, false, tx + 1, T - K],
    ];
    for (const [on, horizontal, lane, offset] of lanes) {
      if (!on) continue;
      const origin = (horizontal ? tx : ty) * T, joints = curbJoints(origin, origin + T, lane, seed);
      for (let i = 0; i + 1 < joints.length; i++) {
        const lo = Math.max(joints[i]!, origin), hi = Math.min(joints[i + 1]!, origin + T);
        if (hi - lo <= 0.4) continue;
        const along = lo - origin, len = hi - lo, tone = CURB_TONES[Math.floor(paveNoise(i + Math.floor(origin / CURB_STONE), lane, seed + 59) * CURB_TONES.length)]!;
        const rx = horizontal ? x + along : x + offset, ry = horizontal ? y + offset : y + along;
        const rw = horizontal ? len : K, rh = horizontal ? K : len;
        c.fillStyle = tone; c.fillRect(rx, ry, rw, rh);
        c.fillStyle = `rgba(${SLAB_LIGHT_RGB},0.7)`; c.fillRect(rx, ry, horizontal ? rw : 1, horizontal ? 1 : rh);
        c.fillStyle = `rgba(27,20,36,0.55)`; c.fillRect(horizontal ? rx : rx + rw - 1, horizontal ? ry + rh - 1 : ry, horizontal ? rw : 1, horizontal ? 1 : rh);
        if (joints[i]! >= origin) { c.fillStyle = SLAB_DARK; c.fillRect(rx, ry, horizontal ? 1 : rw, horizontal ? rh : 1); }
      }
      // fio claro na quina da frente e, por cima, a areia que o vento jogou: um ou dois montinhos
      c.fillStyle = `rgba(255,246,220,0.35)`; 
      if (horizontal) c.fillRect(x, y + (offset === 0 ? 0 : T - 1), T, 1); else c.fillRect(x + (offset === 0 ? 0 : T - 1), y, 1, T);
      for (let n = 0; n < 2; n++) {
        const t = paveNoise(tx * 3 + n, ty * 5 + lane, seed + 61);
        if (t < 0.45) continue;
        const along = 4 + t * (T - 8), cx = horizontal ? x + along : x + offset + K / 2, cy = horizontal ? y + offset + K / 2 : y + along;
        c.fillStyle = `rgba(143,111,63,0.4)`; c.beginPath(); c.ellipse(cx + 0.8, cy + 0.8, 5, 2.2, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = SAND.base; c.beginPath(); c.ellipse(cx, cy, 5, 2.2, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = `rgba(255,246,220,0.55)`; c.beginPath(); c.ellipse(cx - 1, cy - 0.7, 2.6, 0.9, 0, 0, Math.PI * 2); c.fill();
      }
    }
  }

  /** Sombra suave do piso sobre a areia, nos lados do tile de areia que encostam em piso. */
  shade(x: number, y: number, sides: PavedEdges): void {
    const c = this.c, T = TILE_SIZE, W = SHADE_WIDTH;
    const strip = (x0: number, y0: number, x1: number, y1: number, rect: [number, number, number, number]): void => {
      const g = c.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, "rgba(29,22,38,0.34)"); g.addColorStop(1, "rgba(29,22,38,0)");
      c.fillStyle = g; c.fillRect(...rect);
    };
    if (sides.n) strip(x, y, x, y + W, [x, y, T, W]);
    if (sides.s) strip(x, y + T, x, y + T - W, [x, y + T - W, T, W]);
    if (sides.w) strip(x, y, x + W, y, [x, y, W, T]);
    if (sides.e) strip(x + T, y, x + T - W, y, [x + T - W, y, W, T]);
  }
}
const SLAB_LIGHT_RGB = "154,136,164";
