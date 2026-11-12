import { CHUNK_PIXELS, CHUNK_TILES, TILE_SIZE } from "../../../../world/terrain.ts";
import { valueNoise } from "../../../../world/random.ts";
import { BLACK_LAKE_THRESHOLD, blackLakeNoise } from "../../../../world/south/blackLake.ts";
import { MUD_DRY, MUD_WET, RIM, lerpColor, waterColor } from "./palette.ts";
import { lakeCoverage, wobbledCoverage, type LakeAt } from "./coverage.ts";

/** Uma amostra a cada 4 px, ampliada com suavização (um chunk com lago custa poucos ms). */
export const LAKE_STEP = 4;
export const LAKE_SIZE = CHUNK_PIXELS / LAKE_STEP;
/** Quanto o ruído do lago precisa passar do limite para a água ser tão funda quanto possível. */
const DEPTH_SPAN = 0.1;

const smooth = (t: number): number => { const k = Math.max(0, Math.min(1, t)); return k * k * (3 - 2 * k); };

/** Compõe `src` (rgb, alfa 0..1) sobre `dst` (rgb premultiplicado e alfa), devolvendo o novo [r, g, b, a] não premultiplicado. */
function over(dst: [number, number, number, number], r: number, g: number, b: number, a: number): void {
  const out = a + dst[3] * (1 - a);
  if (out <= 0) { dst[0] = dst[1] = dst[2] = dst[3] = 0; return; }
  dst[0] = (r * a + dst[0] * dst[3] * (1 - a)) / out;
  dst[1] = (g * a + dst[1] * dst[3] * (1 - a)) / out;
  dst[2] = (b * a + dst[2] * dst[3] * (1 - a)) / out;
  dst[3] = out;
}

/**
 * RGBA do lago negro de um chunk (ADR 0039), `LAKE_SIZE` × `LAKE_SIZE`: lama molhada na margem, água com profundidade
 * (do raso turvo ao fundo de tinta, pelo mesmo ruído que decide onde há lago), brilho oleoso e um fio claro na borda.
 * Pura (sem canvas): o mesmo chunk e a mesma semente dão sempre os mesmos pixels, e chunks vizinhos se encaixam, porque
 * tudo sai de funções globais e de um mapa de tiles que cobre a margem do chunk.
 */
export function shadeBlackLake(cx: number, cy: number, seed: number, lakeAt: LakeAt): Uint8ClampedArray {
  const out = new Uint8ClampedArray(LAKE_SIZE * LAKE_SIZE * 4);
  const originX = cx * CHUNK_TILES, originY = cy * CHUNK_TILES;
  for (let j = 0; j < LAKE_SIZE; j++) for (let i = 0; i < LAKE_SIZE; i++) {
    const tx = ((i + 0.5) * LAKE_STEP) / TILE_SIZE, ty = ((j + 0.5) * LAKE_STEP) / TILE_SIZE;
    const gx = originX + tx, gy = originY + ty;
    const clean = lakeCoverage(lakeAt, tx, ty), c = wobbledCoverage(clean, gx, gy, seed);
    const px: [number, number, number, number] = [0, 0, 0, 0];
    // 1. Lama molhada na margem: só perto do lago (portão pela cobertura limpa), mais escura junto da água.
    const gate = smooth(clean * 4);
    const mud = smooth((c - 0.12) / 0.4) * gate;
    if (mud > 0.002) {
      const [r, g, b] = lerpColor(MUD_DRY, MUD_WET, smooth((c - 0.15) / 0.35));
      over(px, r, g, b, 0.82 * mud);
    }
    // 2. Água: opaca de 0,5 para dentro, com a borda macia e a cor pela profundidade.
    const water = smooth((c - 0.46) / 0.08);
    if (water > 0.001) {
      const depth = Math.max(0, Math.min(1, (blackLakeNoise(gx, gy, seed) - BLACK_LAKE_THRESHOLD) / DEPTH_SPAN));
      let [r, g, b] = waterColor(depth);
      // Brilho oleoso: um tom roxo ou esverdeado que varia devagar, e marcas finas de corrente.
      const sheen = valueNoise(gx / 3.1 + 5, gy / 2.4, seed + 821) - 0.5;
      const streak = Math.sin((gx * 0.9 + gy * 0.5 + valueNoise(gx / 2, gy / 2, seed + 823) * 3) * Math.PI * 2) * 3;
      r += sheen * 16 + streak * 0.8; g += sheen * 6 + streak; b += sheen * 14 + streak * 1.2;
      over(px, r, g, b, water);
    }
    // 3. Fio claro arroxeado na linha d'água, fino e só do lado de dentro da costa.
    const rim = Math.max(0, 1 - Math.abs(c - 0.5) / 0.05) * smooth((c - 0.4) / 0.1);
    if (rim > 0.01) over(px, RIM[0], RIM[1], RIM[2], 0.4 * rim);
    const o = (j * LAKE_SIZE + i) * 4;
    out[o] = px[0]; out[o + 1] = px[1]; out[o + 2] = px[2]; out[o + 3] = Math.round(px[3] * 255);
  }
  return out;
}
