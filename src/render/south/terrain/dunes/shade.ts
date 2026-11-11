import { CHUNK_PIXELS, CHUNK_TILES, TILE_SIZE } from "../../../../world/terrain.ts";
import { DUNE_LIGHT, duneHeight, rippleHeight } from "./field.ts";
import { DUNES_LOOK, RAMP_STEPS, type ReliefLook } from "./palette.ts";

/** Resolução do sombreamento: uma amostra a cada 4 px, ampliada suavemente depois (um chunk novo custa poucos ms). */
export const SHADE_STEP = 4;
export const SHADE_SIZE = CHUNK_PIXELS / SHADE_STEP;

/**
 * Sombreamento do relevo de um chunk (ADR 0033): RGBA de `SHADE_SIZE` × `SHADE_SIZE`, luz de noroeste.
 * Cada amostra usa a altura e o gradiente do campo contínuo, então chunks vizinhos se encaixam sem costura.
 * Função pura (sem canvas), a mesma saída para o mesmo chunk e semente.
 */
export function shadeDuneRelief(cx: number, cy: number, seed: number, look: ReliefLook = DUNES_LOOK): Uint8ClampedArray {
  const n = SHADE_SIZE, stride = n + 3;
  const perTile = TILE_SIZE / SHADE_STEP;
  const originX = cx * CHUNK_TILES, originY = cy * CHUNK_TILES;
  const unit = 1 / perTile; // um passo de amostra, em tiles
  // Altura numa grade com uma amostra a mais de cada lado, para o gradiente central das bordas.
  const h = new Float32Array(stride * stride);
  for (let j = 0; j < stride; j++) for (let i = 0; i < stride; i++) {
    const tx = originX + (i - 1) * unit, ty = originY + (j - 1) * unit;
    h[j * stride + i] = duneHeight(tx, ty, seed) + rippleHeight(tx, ty, seed);
  }
  const out = new Uint8ClampedArray(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const c = (j + 1) * stride + (i + 1);
    const gx = (h[c + 1]! - h[c - 1]!) / (2 * unit), gy = (h[c + stride]! - h[c - stride]!) / (2 * unit);
    // Luz de noroeste: o que sobe para sudeste está de frente para ela.
    const lit = -(gx * DUNE_LIGHT.x + gy * DUNE_LIGHT.y);
    const t = 0.5 + lit * look.contrast + (h[c]! - 0.45) * 0.16;
    const [r, g, b] = look.ramp[Math.max(0, Math.min(RAMP_STEPS - 1, Math.round(t * (RAMP_STEPS - 1))))]!;
    const o = (j * n + i) * 4;
    out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = 255;
  }
  return out;
}
