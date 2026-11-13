import { valueNoise } from "../../world/random.ts";

/** Uma amostra a cada 4 px: o andar de 42×30 tiles vira 336×240 amostras. */
export const ROCK_STEP = 4;
export const ROCK_PER_TILE = 32 / ROCK_STEP;
/** A água ocupa a amostra quando a mistura de tiles molhados passa deste nível (abaixo de 0,5: uma poça de um tile vira uma lagoa redonda e cheia). */
export const WET_LEVEL = 0.32;

/** Mapa de tiles abertos: `open(x, y)` diz se o tile é chão (ou água); fora do mapa é rocha. */
export interface TileOpenness {
  readonly width: number; readonly height: number; readonly open: (x: number, y: number) => boolean;
  /** Se o tile é água (um tile aberto); sem a função, não há água. */
  readonly wet?: (x: number, y: number) => boolean;
}

/** A silhueta suave do vazio: aberto/fechado por amostra e a abertura contínua (0 a 1) de que ela saiu. */
export interface RockShape {
  readonly w: number; readonly h: number; readonly open: Uint8Array; readonly field: Float32Array;
  /** Amostras de água (sempre dentro do vazio): a poça tem a mesma silhueta suave, sem quadrados de tile. */
  readonly wet: Uint8Array;
}

/**
 * Silhueta arredondada do vazio. Cada amostra interpola a abertura entre os centros dos tiles vizinhos, de modo que uma reta
 * de tiles continua reta, uma quina para fora é arredondada e uma quina para dentro é suavizada; um leve tremor de ruído tira
 * a regularidade. A borda nunca passa de cerca de um quarto de tile (8 px) da borda do tile, então a colisão, que é por tile,
 * continua valendo a olho.
 */
export function rockShape(tiles: TileOpenness, seed: number): RockShape {
  const w = tiles.width * ROCK_PER_TILE, h = tiles.height * ROCK_PER_TILE;
  const at = (x: number, y: number): number => (x < 0 || y < 0 || x >= tiles.width || y >= tiles.height ? 0 : tiles.open(x, y) ? 1 : 0);
  const field = new Float32Array(w * h), open = new Uint8Array(w * h), wet = new Uint8Array(w * h);
  const wetAt = (x: number, y: number): number => (tiles.wet && x >= 0 && y >= 0 && x < tiles.width && y < tiles.height && tiles.wet(x, y) ? 1 : 0);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    // posição em tiles relativa ao centro do tile de cima e da esquerda
    const u = (i + 0.5) / ROCK_PER_TILE - 0.5, v = (j + 0.5) / ROCK_PER_TILE - 0.5;
    const x0 = Math.floor(u), y0 = Math.floor(v), fx = u - x0, fy = v - y0;
    const o = (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) + (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy;
    const wobble = (valueNoise(u / 1.3 + 40, v / 1.3 + 40, seed + 621) - 0.5) * 0.2;
    const k = j * w + i;
    field[k] = o + wobble;
    open[k] = field[k]! > 0.5 ? 1 : 0;
    if (open[k] && tiles.wet) {
      const q = (wetAt(x0, y0) * (1 - fx) + wetAt(x0 + 1, y0) * fx) * (1 - fy) + (wetAt(x0, y0 + 1) * (1 - fx) + wetAt(x0 + 1, y0 + 1) * fx) * fy;
      const ripple = (valueNoise(u / 1.1 + 90, v / 1.1 + 90, seed + 623) - 0.5) * 0.3;
      wet[k] = q + ripple > WET_LEVEL ? 1 : 0;
    }
  }
  return { w, h, open, field, wet };
}

/**
 * Distância (em amostras, limitada a `cap`) de cada amostra ao conjunto das que têm `mask[k] === target`; as amostras do
 * próprio conjunto valem 0. Passada dupla de distância em xadrez, barata e sem canvas.
 */
export function distanceTo(mask: Uint8Array, w: number, h: number, target: 0 | 1, cap: number): Float32Array {
  const d = new Float32Array(w * h).fill(cap);
  for (let k = 0; k < d.length; k++) if (mask[k] === target) d[k] = 0;
  const D = 1, DIAG = Math.SQRT2;
  const relax = (k: number, other: number, cost: number): void => { const c = d[other]! + cost; if (c < d[k]!) d[k] = c; };
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = j * w + i;
    if (i > 0) relax(k, k - 1, D);
    if (j > 0) { relax(k, k - w, D); if (i > 0) relax(k, k - w - 1, DIAG); if (i < w - 1) relax(k, k - w + 1, DIAG); }
  }
  for (let j = h - 1; j >= 0; j--) for (let i = w - 1; i >= 0; i--) {
    const k = j * w + i;
    if (i < w - 1) relax(k, k + 1, D);
    if (j < h - 1) { relax(k, k + w, D); if (i < w - 1) relax(k, k + w + 1, DIAG); if (i > 0) relax(k, k + w - 1, DIAG); }
  }
  return d;
}
