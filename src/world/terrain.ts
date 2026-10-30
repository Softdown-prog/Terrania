import { hash2, valueNoise } from './random.ts';
import { villageGround } from './village.ts';
export const TILE_SIZE = 32;
export const CHUNK_TILES = 16;
export const CHUNK_PIXELS = TILE_SIZE * CHUNK_TILES;
export type Ground = 'grass' | 'forest' | 'path' | 'sand' | 'water';
export interface Tile { ground: Ground; tree: boolean; rock: boolean; decoration: number; }
/** Terreno indexado por coordenadas globais: chunks vizinhos sempre encaixam. */
export function getTile(tx: number, ty: number, seed: number): Tile {
  const detail = hash2(tx, ty, seed + 31);
  const village = villageGround(tx, ty);
  if (village) return { ground: village, tree: false, rock: false, decoration: detail };
  const forest = valueNoise(tx / 15 + 13.7, ty / 15, seed + 9);
  const terrain = valueNoise(tx / 32, ty / 32, seed + 71);
  const river = Math.sin(tx * 0.04 + seed * 0.0001) * 7 + 15;
  const center = Math.hypot(tx, ty) < 7;
  let ground: Ground = 'grass';
  if (!center && (Math.abs(ty - river) < 2.1 || terrain < 0.275)) ground = 'water';
  else if (!center && (Math.abs(ty - river) < 3.25 || terrain < 0.322)) ground = 'sand';
  else if (Math.abs(ty - Math.sin(tx * 0.055) * 1.35) < 0.54) ground = 'path';
  else if (!center && forest > 0.52) ground = 'forest';
  const tree = ground === 'forest' && detail > 0.80;
  const rock = ground !== 'water' && ground !== 'path' && !center && detail < 0.022;
  return { ground, tree, rock, decoration: detail };
}
export function isWalkable(tx: number, ty: number, seed: number): boolean {
  const tile = getTile(tx, ty, seed);
  return tile.ground !== 'water' && !tile.tree && !tile.rock;
}
export function chunkOf(value: number): number { return Math.floor(value / CHUNK_PIXELS); }
