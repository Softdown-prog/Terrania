import { hash2 } from "./random.ts";
import { getRegionWeights } from "./regions.ts";
import { getRegionalLandmarkForCell, LANDMARK_CELL_TILES } from "./regionalLandmarks.ts";
import { CHUNK_TILES, getTile, TILE_SIZE } from "./terrain.ts";

/**
 * Ruínas abandonadas dos Ermos do Sul (ADR 0017). Sistema próprio, separado dos marcos regionais:
 * não muda `regionalLandmarks.ts` (que o Go espelha) e tem colisão e arte derivadas das MESMAS
 * peças (`RUIN_PIECES`), para que o que se vê seja o que bloqueia.
 */
export const RUIN_CELL_TILES = 160;
export type RuinVariant = 0 | 1 | 2 | 3;
export const RUIN_NAMES: Readonly<Record<RuinVariant, string>> = {
  0: "Colunata Quebrada", 1: "Templo Desabado", 2: "Torre Caída", 3: "Muralha do Povoado",
};
export type RuinPieceKind = "column" | "wall" | "pillar" | "steps" | "drum" | "pot" | "oven";
/** Peça no chão. (x, y) é o centro da base em pixels, a partir do ponto de contato da ruína;
 * y negativo fica ao fundo. `solid` decide se a colisão a respeita.
 */
export interface RuinPiece {
  readonly kind: RuinPieceKind;
  readonly x: number; readonly y: number;
  readonly w: number; readonly h: number;
  readonly solid: boolean;
}
const p = (kind: RuinPieceKind, x: number, y: number, w: number, h: number, solid = true): RuinPiece =>
  ({ kind, x, y, w, h, solid });

export const RUIN_PIECES: Readonly<Record<RuinVariant, readonly RuinPiece[]>> = {
  // Cinco colunas em fila; uma verga caída fecha o vão da esquerda.
  0: [p("steps", 0, 14, 200, 14, false),
    p("column", -84, 0, 14, 10), p("column", -42, 0, 14, 10), p("column", 0, 0, 14, 10),
    p("column", 42, 0, 14, 10), p("column", 84, 0, 14, 10),
    p("wall", -63, 5, 28, 8), p("drum", -62, 24, 16, 10, false), p("drum", 72, 26, 14, 9, false)],
  // Parede de fundo com porta, dois pilares do arco e colunas na frente.
  1: [p("steps", 0, 36, 120, 14, false),
    p("wall", -66, -26, 60, 12), p("wall", 62, -26, 52, 12),
    p("pillar", -30, -26, 12, 12), p("pillar", 30, -26, 12, 12),
    p("wall", -96, -8, 12, 36), p("wall", 90, -8, 12, 28),
    p("column", -70, 16, 14, 10), p("column", 70, 16, 14, 10),
    p("drum", 8, 26, 16, 10, false), p("drum", -40, 32, 12, 8, false)],
  // Anel de pedra quebrado em volta de uma torre caída; a entrada fica ao sul.
  2: [p("steps", 0, 6, 120, 70, false),
    p("wall", 0, -34, 76, 12), p("wall", -44, -10, 12, 40), p("wall", 44, -14, 12, 30),
    p("wall", -30, 16, 26, 10), p("wall", 34, 12, 14, 10),
    p("drum", 74, 26, 18, 10, false), p("drum", -76, 24, 16, 10, false), p("drum", 12, 6, 14, 9, false)],
  // Muralha de tijolo de barro em L, com o meio desabado e um forno de pão.
  3: [p("steps", -10, 10, 190, 56, false),
    p("wall", -52, -26, 74, 12), p("wall", 40, -26, 44, 12), p("wall", -92, 0, 12, 48),
    p("oven", 52, 2, 22, 16), p("wall", -48, 28, 44, 8),
    p("pot", -20, 10, 8, 6, false), p("pot", 20, 14, 9, 6, false), p("drum", 80, 24, 14, 9, false)],
};

export interface SouthRuin {
  readonly id: string;
  readonly kind: "desert-ruins";
  readonly name: string;
  readonly variant: RuinVariant;
  readonly tileX: number;
  readonly tileY: number;
  readonly x: number;
  readonly y: number;
}

/** Pegada total da ruína em pixels, a partir do contato: ±112 em x, de -64 a +48 em y. */
const FOOT = { left: 112, right: 112, up: 64, down: 48 } as const;
const MARGIN_CELL = 24;
const SOUTH_WEIGHT = 0.62;
const PROBES = 24;
const REACH = 6; // tiles de busca ao redor do ponto sorteado
const mod = (n: number, m: number): number => ((n % m) + m) % m;

interface Base { readonly tx: number; readonly ty: number; }
/** Ponto sorteado da célula; barato (só hash), usado para descartar colisões distantes. */
function base(cellX: number, cellY: number, seed: number): Base | null {
  if (![cellX, cellY, seed].every(Number.isSafeInteger)) return null;
  if (hash2(cellX, cellY, seed + 6101) >= 0.34) return null;
  const span = RUIN_CELL_TILES - MARGIN_CELL * 2;
  return {
    tx: cellX * RUIN_CELL_TILES + MARGIN_CELL + Math.floor(hash2(cellX, cellY, seed + 6113) * span),
    ty: cellY * RUIN_CELL_TILES + MARGIN_CELL + Math.floor(hash2(cellX, cellY, seed + 6121) * span),
  };
}

/** A pegada inteira precisa ser chão livre: sem água, árvore, rocha nem via. */
function footprintClear(tx: number, ty: number, seed: number): boolean {
  const x0 = tx - Math.ceil(FOOT.left / TILE_SIZE), x1 = tx + Math.ceil(FOOT.right / TILE_SIZE);
  const y0 = ty - Math.ceil(FOOT.up / TILE_SIZE), y1 = ty + Math.ceil(FOOT.down / TILE_SIZE);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const tile = getTile(x, y, seed);
      if (tile.ground === "water" || tile.ground === "path" || tile.tree || tile.rock) return false;
    }
  return true;
}

/** Longe de marco regional, para duas peças altas nunca se sobreporem. */
function clearOfLandmark(tx: number, ty: number, seed: number): boolean {
  const cx = Math.floor(tx / LANDMARK_CELL_TILES), cy = Math.floor(ty / LANDMARK_CELL_TILES);
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const landmark = getRegionalLandmarkForCell(cx + dx, cy + dy, seed);
      if (landmark && Math.hypot(landmark.tileX - tx, landmark.tileY - ty) < 12) return false;
    }
  return true;
}

const cache = new Map<string, SouthRuin | null>();
/** Em cache porque a colisão, o desenho e o atlas perguntam a mesma célula a cada quadro. */
export function getSouthRuinForCell(cellX: number, cellY: number, seed: number): SouthRuin | null {
  const origin = base(cellX, cellY, seed);
  if (!origin) return null;
  const key = seed + ":" + cellX + ":" + cellY;
  const hit = cache.get(key);
  if (hit !== undefined) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const found = locate(cellX, cellY, seed, origin);
  cache.set(key, found);
  if (cache.size > 128) cache.delete(cache.keys().next().value!);
  return found;
}

function locate(cellX: number, cellY: number, seed: number, origin: Base): SouthRuin | null {
  for (let i = 0; i < PROBES; i++) {
    const tx = origin.tx + (i === 0 ? 0 : ((i * 5) % (REACH * 2 + 1)) - REACH);
    const ty = origin.ty + (i === 0 ? 0 : ((i * 7) % (REACH * 2 - 1)) - (REACH - 1));
    // Margem de 4 tiles dentro do bloco de 16: a arte nunca atravessa a borda do bloco desenhado.
    if (mod(tx, CHUNK_TILES) < 4 || mod(tx, CHUNK_TILES) > 11 ||
        mod(ty, CHUNK_TILES) < 4 || mod(ty, CHUNK_TILES) > 11) continue;
    if (Math.floor(tx / RUIN_CELL_TILES) !== cellX || Math.floor(ty / RUIN_CELL_TILES) !== cellY) continue;
    if (getRegionWeights(tx, ty).south < SOUTH_WEIGHT) continue;
    if (!clearOfLandmark(tx, ty, seed) || !footprintClear(tx, ty, seed)) continue;
    const variant = Math.min(3, Math.floor(hash2(cellX, cellY, seed + 6131) * 4)) as RuinVariant;
    return { id: `south-ruin:${seed}:${cellX}:${cellY}`, kind: "desert-ruins", name: RUIN_NAMES[variant],
      variant, tileX: tx, tileY: ty, x: (tx + 0.5) * TILE_SIZE, y: (ty + 0.5) * TILE_SIZE };
  }
  return null;
}

/** Colisão pelas peças sólidas. Rejeita barato quando longe do ponto sorteado. */
export function southRuinBlocks(x: number, y: number, radius: number, seed: number): boolean {
  const cellX = Math.floor(Math.floor(x / TILE_SIZE) / RUIN_CELL_TILES);
  const cellY = Math.floor(Math.floor(y / TILE_SIZE) / RUIN_CELL_TILES);
  const origin = base(cellX, cellY, seed);
  if (!origin) return false;
  const reach = REACH * TILE_SIZE + FOOT.left + radius + 16;
  if (Math.abs(x - (origin.tx + 0.5) * TILE_SIZE) > reach ||
      Math.abs(y - (origin.ty + 0.5) * TILE_SIZE) > reach) return false;
  const ruin = getSouthRuinForCell(cellX, cellY, seed);
  if (!ruin) return false;
  return RUIN_PIECES[ruin.variant].some(piece => piece.solid &&
    Math.abs(x - ruin.x - piece.x) < piece.w / 2 + radius &&
    Math.abs(y - ruin.y - piece.y) < piece.h / 2 + radius);
}

/** Ruínas dentro de um retângulo de tiles (consulta limitada, nunca varre o mundo). */
export function southRuinsInArea(minTileX: number, minTileY: number, maxTileX: number,
  maxTileY: number, seed: number): SouthRuin[] {
  if (![minTileX, minTileY, maxTileX, maxTileY, seed].every(Number.isFinite)) return [];
  const a = Math.floor(minTileX / RUIN_CELL_TILES), b = Math.floor(maxTileX / RUIN_CELL_TILES);
  const c = Math.floor(minTileY / RUIN_CELL_TILES), d = Math.floor(maxTileY / RUIN_CELL_TILES);
  if (b < a || d < c || (b - a + 1) * (d - c + 1) > 64) return [];
  const out: SouthRuin[] = [];
  for (let cy = c; cy <= d; cy++)
    for (let cx = a; cx <= b; cx++) {
      const ruin = getSouthRuinForCell(cx, cy, seed);
      if (ruin && ruin.tileX >= minTileX && ruin.tileX <= maxTileX &&
          ruin.tileY >= minTileY && ruin.tileY <= maxTileY) out.push(ruin);
    }
  return out;
}
