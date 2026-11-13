import { ROCK_LIGHT, rockHeight } from "./field.ts";
import { ROCK_PER_TILE, distanceTo, type RockShape } from "./openness.ts";
import { ROCK_RAMP_STEPS, type RockLook } from "./look.ts";

/** Quanto a sombra de oclusão chega no chão (em amostras, 5 = 20 px) e quão fundo a parede escurece (8 = 32 px). */
export const AO_REACH = 5;
export const DEPTH_REACH = 8;
/** Largura do filete de luz na borda da rocha (em amostras). */
export const LIP_WIDTH = 1.8;
/** Largura do filete claro na margem da água (em amostras). */
export const SHORE_WIDTH = 2;

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/**
 * Sombreamento da rocha do andar inteiro (ADR 0051): RGBA de `shape.w` × `shape.h`, opaco, luz de noroeste. O chão e a parede
 * saem do mesmo campo de altura contínuo; o chão escurece junto das paredes (oclusão), a parede escurece com a profundidade
 * e ganha um filete de luz na borda voltada para a luz. Função pura: o mesmo andar e semente dão a mesma saída.
 */
export function shadeRock(shape: RockShape, seed: number, look: RockLook): Uint8ClampedArray {
  const { w, h, open, field, wet } = shape, stride = w + 2, unit = 1 / ROCK_PER_TILE;
  const height = new Float32Array(stride * (h + 2));
  for (let j = 0; j < h + 2; j++) for (let i = 0; i < stride; i++)
    height[j * stride + i] = rockHeight((i - 0.5) * unit, (j - 0.5) * unit, seed);
  const toWall = distanceTo(open, w, h, 0, AO_REACH), toOpen = distanceTo(open, w, h, 1, DEPTH_REACH);
  const toDry = distanceTo(wet, w, h, 0, SHORE_WIDTH + 1);
  const out = new Uint8ClampedArray(w * h * 4);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = j * w + i, c = (j + 1) * stride + (i + 1);
    const gx = (height[c + 1]! - height[c - 1]!) / (2 * unit), gy = (height[c + stride]! - height[c - stride]!) / (2 * unit);
    const lit = -(gx * ROCK_LIGHT.x + gy * ROCK_LIGHT.y);
    let r: number, g: number, b: number;
    if (open[k]) {
      const t = 0.5 + lit * 0.24 + (height[c]! - 0.5) * 0.7;
      [r, g, b] = look.floor[clamp(Math.round(t * (ROCK_RAMP_STEPS - 1)), 0, ROCK_RAMP_STEPS - 1)]!;
      const ao = 1 - toWall[k]! / AO_REACH, f = 1 - 0.5 * ao * ao;
      r *= f; g *= f; b *= f;
      if (wet[k]) {
        // água: o mesmo relevo, em azul, mais escura no fundo e com um filete claro na margem
        const wt = 0.42 + lit * 0.6 + (height[c]! - 0.5) * 0.5 + Math.sin((i + j * 0.6) * 0.5 + height[c]! * 9) * 0.07;
        [r, g, b] = look.water[clamp(Math.round(wt * (ROCK_RAMP_STEPS - 1)), 0, ROCK_RAMP_STEPS - 1)]!;
        const shore = Math.max(0, 1 - toDry[k]! / SHORE_WIDTH) * 0.55;
        r += (look.shore[0] - r) * shore; g += (look.shore[1] - g) * shore; b += (look.shore[2] - b) * shore;
        r *= f; g *= f; b *= f;
      }
    } else {
      const t = 0.45 + lit * 0.5 + (height[c]! - 0.5) * 0.6;
      [r, g, b] = look.wall[clamp(Math.round(t * (ROCK_RAMP_STEPS - 1)), 0, ROCK_RAMP_STEPS - 1)]!;
      const depth = Math.min(1, toOpen[k]! / DEPTH_REACH), f = 1 - 0.38 * depth;
      r *= f; g *= f; b *= f;
      if (toOpen[k]! < LIP_WIDTH) {
        // o filete só acende onde a borda da rocha olha para a luz: a abertura cresce rumo a noroeste
        const fx = field[k + (i < w - 1 ? 1 : 0)]! - field[k - (i > 0 ? 1 : 0)]!, fy = field[k + (j < h - 1 ? w : 0)]! - field[k - (j > 0 ? w : 0)]!;
        const len = Math.hypot(fx, fy) || 1, facing = Math.max(0, (fx * ROCK_LIGHT.x + fy * ROCK_LIGHT.y) / len);
        const strength = facing * (1 - toOpen[k]! / LIP_WIDTH) * 0.7;
        r += (look.rim[0] - r) * strength; g += (look.rim[1] - g) * strength; b += (look.rim[2] - b) * strength;
      }
    }
    const o = k * 4;
    out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = 255;
  }
  return out;
}
