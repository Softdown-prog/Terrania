import { hash2, valueNoise } from './random.ts';
import { villageGround, starterCaveTrail } from './village.ts';
import { southCityGround, SOUTH_CITY } from './southCity.ts';
import { classifyBiome, type Biome } from './biomes.ts';
import { getTerrainProfile } from './terrainProfiles.ts';
export const TILE_SIZE = 32;
export const CHUNK_TILES = 16;
export const CHUNK_PIXELS = TILE_SIZE * CHUNK_TILES;
export type Ground = 'grass' | 'forest' | 'path' | 'sand' | 'water';
export interface Tile { ground: Ground; biome: Biome; tree: boolean; rock: boolean; decoration: number; }
/** Lagos negros dos Ermos do Sul: manchas de água escura, só longe do centro (ADR 0017).
 * Ruído de duas escalas dá margem irregular; o limiar deixa ~2,6% do Sul alagado.
 */
/** Poço Negro e suas estradas ficam livres de lago e de ruína: 80 tiles de cada lado e do norte ao sul das estradas. */
export function nearSouthCity(tx: number, ty: number): boolean {
  return Math.abs(tx - SOUTH_CITY.centerX) < 80 && ty > SOUTH_CITY.centerY - 70 && ty < SOUTH_CITY.centerY + 60;
}
export function isBlackLake(tx: number, ty: number, seed: number, southWeight: number): boolean {
  if (southWeight < 0.62 || nearSouthCity(tx, ty)) return false;
  const n = valueNoise(tx / 40 + 7.3, ty / 40 - 2.9, seed + 5003) * 0.78 +
    valueNoise(tx / 12 + 1.1, ty / 12 + 4.4, seed + 5009) * 0.22;
  return n > 0.82;
}
/** Gerador compartilhado por servidor, colisão, render e atlas. Sem dependências gráficas. */
export function getTile(tx: number, ty: number, seed: number): Tile {
  const detail = hash2(tx, ty, seed + 31);
  const south = southCityGround(tx,ty);
  if (south) return { ground:south, biome:south==='path'?'trail':'ruins',
    tree:false,rock:false,decoration:detail };
  const village = villageGround(tx, ty) ?? (starterCaveTrail(tx, ty) ? 'path' : null);
  if (village) return { ground: village, biome: village === 'path' ? 'trail' : 'meadow',
    tree: false, rock: false, decoration: detail };
  const p = getTerrainProfile(tx, ty, seed);
  const biome = classifyBiome(p);
  const forest = valueNoise(tx / 15 + 13.7, ty / 15, seed + 9);
  const terrain = valueNoise(tx / 32, ty / 32, seed + 71);
  const center = Math.hypot(tx, ty) < 7;
  const river = Math.sin(tx * 0.04 + seed * 0.0001) * 7 + 15;
  // Duas vias principais de exploração atravessam os quadrantes. Sem árvore/rocha/água.
  // Preserve the starter area's tested collision and combat geometry.
  const starterArea = Math.hypot(tx, ty) < 64;
  const mainRoute = !starterArea && (Math.abs(tx) < 1.5 || Math.abs(ty) < 1.5 ||
    Math.abs(ty - Math.sin(tx / 1200) * 7) < 1.5 ||
    Math.abs(tx - Math.sin(ty / 1200) * 7) < 1.5);
  const villageTrail = Math.abs(ty - Math.sin(tx * 0.055) * 1.35) < 0.54;
  let ground: Ground = 'grass';
  if (mainRoute || villageTrail) ground = 'path';
  else if (biome === 'open-sea') {
    // Plataformas de terreno emergem em ilhas grandes, não como pixels isolados.
    ground = terrain > 0.62 && p.coast < 0.93 ? 'sand' : 'water';
  } else if (p.coast > 0.42 && terrain + p.coast * 0.32 > 0.82) ground = 'water';
  else if (p.coast > 0.27 || biome === 'beach' || biome === 'island') ground = 'sand';
  else if (p.weights.north > 0.4 && p.temperature < 0.27) {
    ground = !center && terrain < 0.22 ? 'water' :
      p.humidity > 0.48 || p.altitude > 0.45 ? 'sand' : 'grass';
  } else if (isBlackLake(tx, ty, seed, p.weights.south)) {
    ground = 'water';
  } else if (p.weights.south > 0.4 || biome === 'dunes' || biome === 'ruins') {
    ground = biome === 'oasis' && terrain > 0.67 ? 'grass' : 'sand';
  } else if (p.weights.west > 0.39) {
    ground = p.altitude > 0.48 ? 'sand' : 'grass';
  } else if (!center && p.weights.center > 0.3 &&
      (Math.abs(ty - river) < 2.1 || terrain < 0.275)) ground = 'water';
  else if (!center && p.weights.center > 0.3 &&
      (Math.abs(ty - river) < 3.25 || terrain < 0.322)) ground = 'sand';
  else if (!center && forest > 0.52 && (starterArea || p.humidity > 0.39)) ground = 'forest';
  const tree = (ground === 'forest' && detail > 0.80) ||
    (biome === 'tundra' && ground === 'grass' && detail > 0.987);
  const rock = ground !== 'water' && ground !== 'path' && !center &&
    detail < (p.weights.west > 0.4 ? 0.09 : 0.022);
  return { ground, biome: ground === 'path' ? 'trail' :
    ground === 'water' && isBlackLake(tx, ty, seed, p.weights.south) ? 'black-lake' :
    ground === 'water' && p.temperature < 0.28 ? 'frozen-lake' :
    ground !== 'water' && biome === 'open-sea' ? 'island' : biome,
    tree, rock, decoration: detail };
}
export function isWalkable(tx: number, ty: number, seed: number): boolean {
  const tile = getTile(tx, ty, seed);
  return tile.ground !== 'water' && !tile.tree && !tile.rock;
}
export function chunkOf(value: number): number { return Math.floor(value / CHUNK_PIXELS); }
