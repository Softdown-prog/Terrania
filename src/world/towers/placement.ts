import { hash2 } from "../random.ts";
import { getRegionWeights } from "../regions.ts";
import { getRegionalLandmarkForCell, LANDMARK_CELL_TILES } from "../regionalLandmarks.ts";
import { getSouthRuinForCell, RUIN_CELL_TILES } from "../southRuins.ts";
import { CHUNK_TILES, getTile, nearSouthCity, TILE_SIZE } from "../terrain.ts";
import { TOWERS } from "./index.ts";
import type { TowerDefinition } from "./types.ts";

/**
 * Onde as torres do Sul ficam no mundo (ADR 0019): uma por célula sorteada, em chão livre, longe do
 * Poço Negro, das ruínas e do marco regional. Sistema próprio: não mexe em `regionalLandmarks.ts`.
 * A colisão vem dos blocos de cada ficha, os mesmos que a arte desenha.
 */
export const TOWER_CELL_TILES = 224;
export interface SouthTower {
  readonly id: string;
  readonly tower: TowerDefinition;
  readonly tileX: number;
  readonly tileY: number;
  /** Ponto de contato com o chão (centro da frente da torre). */
  readonly x: number;
  readonly y: number;
}

/** Pegada que precisa ser chão livre, em pixels a partir do contato. */
const FOOT = { side: 104, up: 72, down: 64 } as const;
const MARGIN_CELL = 28;
const SOUTH_WEIGHT = 0.62;
const PROBES = 24;
const REACH = 6;
const mod = (n: number, m: number): number => ((n % m) + m) % m;

interface Base { readonly tx: number; readonly ty: number; }
/** Ponto sorteado da célula; barato (só hash), para descartar consultas de colisão distantes. */
function base(cellX: number, cellY: number, seed: number): Base | null {
  if (![cellX, cellY, seed].every(Number.isSafeInteger)) return null;
  if (hash2(cellX, cellY, seed + 6301) >= 0.3) return null;
  const span = TOWER_CELL_TILES - MARGIN_CELL * 2;
  return {
    tx: cellX * TOWER_CELL_TILES + MARGIN_CELL + Math.floor(hash2(cellX, cellY, seed + 6313) * span),
    ty: cellY * TOWER_CELL_TILES + MARGIN_CELL + Math.floor(hash2(cellX, cellY, seed + 6317) * span),
  };
}

function pickTower(cellX: number, cellY: number, seed: number): TowerDefinition {
  const total = TOWERS.reduce((sum, tower) => sum + tower.weight, 0);
  let roll = hash2(cellX, cellY, seed + 6329) * total;
  for (const tower of TOWERS) {
    roll -= tower.weight;
    if (roll < 0) return tower;
  }
  return TOWERS[TOWERS.length - 1]!;
}

function footprintClear(tx: number, ty: number, seed: number): boolean {
  const x0 = tx - Math.ceil(FOOT.side / TILE_SIZE), x1 = tx + Math.ceil(FOOT.side / TILE_SIZE);
  const y0 = ty - Math.ceil(FOOT.up / TILE_SIZE), y1 = ty + Math.ceil(FOOT.down / TILE_SIZE);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const tile = getTile(x, y, seed);
      if (tile.ground === "water" || tile.ground === "path" || tile.tree || tile.rock) return false;
    }
  return true;
}

/** Longe de marco regional e de ruína: duas peças altas nunca se sobrepõem. */
function clearOfOthers(tx: number, ty: number, seed: number): boolean {
  const lx = Math.floor(tx / LANDMARK_CELL_TILES), ly = Math.floor(ty / LANDMARK_CELL_TILES);
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const landmark = getRegionalLandmarkForCell(lx + dx, ly + dy, seed);
      if (landmark && Math.hypot(landmark.tileX - tx, landmark.tileY - ty) < 14) return false;
    }
  const rx = Math.floor(tx / RUIN_CELL_TILES), ry = Math.floor(ty / RUIN_CELL_TILES);
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const ruin = getSouthRuinForCell(rx + dx, ry + dy, seed);
      if (ruin && Math.hypot(ruin.tileX - tx, ruin.tileY - ty) < 14) return false;
    }
  return true;
}

const cache = new Map<string, SouthTower | null>();
/** Em cache porque a colisão, o desenho e o atlas perguntam a mesma célula a cada quadro. */
export function getSouthTowerForCell(cellX: number, cellY: number, seed: number): SouthTower | null {
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

function locate(cellX: number, cellY: number, seed: number, origin: Base): SouthTower | null {
  for (let i = 0; i < PROBES; i++) {
    const tx = origin.tx + (i === 0 ? 0 : ((i * 5) % (REACH * 2 + 1)) - REACH);
    const ty = origin.ty + (i === 0 ? 0 : ((i * 7) % (REACH * 2 - 1)) - (REACH - 1));
    // Margem de 4 tiles dentro do bloco de 16: a arte, que é alta, nunca atravessa a borda do bloco desenhado.
    if (mod(tx, CHUNK_TILES) < 4 || mod(tx, CHUNK_TILES) > 11 ||
        mod(ty, CHUNK_TILES) < 5 || mod(ty, CHUNK_TILES) > 11) continue;
    if (Math.floor(tx / TOWER_CELL_TILES) !== cellX || Math.floor(ty / TOWER_CELL_TILES) !== cellY) continue;
    if (getRegionWeights(tx, ty).south < SOUTH_WEIGHT || nearSouthCity(tx, ty)) continue;
    if (!clearOfOthers(tx, ty, seed) || !footprintClear(tx, ty, seed)) continue;
    const tower = pickTower(cellX, cellY, seed);
    return { id: `south-tower:${seed}:${cellX}:${cellY}`, tower, tileX: tx, tileY: ty,
      x: (tx + 0.5) * TILE_SIZE, y: (ty + 0.5) * TILE_SIZE };
  }
  return null;
}

/** Colisão pelos blocos da torre. Rejeita barato quando longe do ponto sorteado. */
export function southTowerBlocks(x: number, y: number, radius: number, seed: number): boolean {
  const cellX = Math.floor(Math.floor(x / TILE_SIZE) / TOWER_CELL_TILES);
  const cellY = Math.floor(Math.floor(y / TILE_SIZE) / TOWER_CELL_TILES);
  const origin = base(cellX, cellY, seed);
  if (!origin) return false;
  const reach = REACH * TILE_SIZE + FOOT.side + radius + 16;
  if (Math.abs(x - (origin.tx + 0.5) * TILE_SIZE) > reach ||
      Math.abs(y - (origin.ty + 0.5) * TILE_SIZE) > reach) return false;
  const placed = getSouthTowerForCell(cellX, cellY, seed);
  if (!placed) return false;
  return placed.tower.blocks.some(block =>
    Math.abs(x - placed.x - block.x) < block.w / 2 + radius &&
    Math.abs(y - placed.y - block.y) < block.h / 2 + radius);
}

/** Torres dentro de um retângulo de tiles (consulta limitada, nunca varre o mundo). */
export function southTowersInArea(minTileX: number, minTileY: number, maxTileX: number,
  maxTileY: number, seed: number): SouthTower[] {
  if (![minTileX, minTileY, maxTileX, maxTileY, seed].every(Number.isFinite)) return [];
  const a = Math.floor(minTileX / TOWER_CELL_TILES), b = Math.floor(maxTileX / TOWER_CELL_TILES);
  const c = Math.floor(minTileY / TOWER_CELL_TILES), d = Math.floor(maxTileY / TOWER_CELL_TILES);
  if (b < a || d < c || (b - a + 1) * (d - c + 1) > 64) return [];
  const out: SouthTower[] = [];
  for (let cy = c; cy <= d; cy++)
    for (let cx = a; cx <= b; cx++) {
      const placed = getSouthTowerForCell(cx, cy, seed);
      if (placed && placed.tileX >= minTileX && placed.tileX <= maxTileX &&
          placed.tileY >= minTileY && placed.tileY <= maxTileY) out.push(placed);
    }
  return out;
}
