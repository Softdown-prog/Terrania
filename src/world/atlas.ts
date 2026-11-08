import { WORLD_EDGE_PIXELS } from "./collision.ts";
import { getTile, TILE_SIZE, type Ground } from "./terrain.ts";
import { getWorldRegion, REGIONS, type WorldRegion } from "./regions.ts";
import { BIOME_NAMES, type Biome } from "./biomes.ts";

/** The terrain generator is coordinate-based; only movement has a technical bound. */
export const WORLD_HALF_TILES = WORLD_EDGE_PIXELS / TILE_SIZE;
export const WORLD_SPAN_TILES = WORLD_HALF_TILES * 2;
export type AtlasScale = "world" | "sector" | "nearby";
export type AtlasSector = {
  readonly id: number;
  readonly name: string;
  readonly centerX: number;
  readonly centerY: number;
  readonly dominant: Ground;
  readonly region: WorldRegion;
  readonly biome: Biome;
  readonly regionName: string;
};
export interface AtlasFrame {
  readonly centerX: number;
  readonly centerY: number;
  readonly spanTiles: number;
}
const NAMES = [
  "Noroeste", "Norte", "Nordeste",
  "Oeste", "Centro", "Leste",
  "Sudoeste", "Sul", "Sudeste",
] as const;
const GROUNDS: readonly Ground[] = ["grass", "forest", "path", "sand", "water"];
export { BIOME_NAMES };
export const GROUND_NAMES: Record<Ground, string> = {
  grass: "Campos", forest: "Florestas", path: "Trilhas",
  sand: "Areias", water: "Águas",
};
function clampIndex(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(0, Math.min(2, Math.floor((value + WORLD_HALF_TILES) / WORLD_SPAN_TILES * 3)));
}
export function sectorIndex(tileX: number, tileY: number): number {
  return clampIndex(tileY) * 3 + clampIndex(tileX);
}
export function sectorCenter(id: number): { x: number; y: number } {
  const safeId = Number.isInteger(id) && id >= 0 && id < 9 ? id : 4;
  const step = WORLD_SPAN_TILES / 3;
  return {
    x: -WORLD_HALF_TILES + ((safeId % 3) + 0.5) * step,
    y: -WORLD_HALF_TILES + (Math.floor(safeId / 3) + 0.5) * step,
  };
}
/** Cartographic sectors are coordinates, not invented settlements or quests. */
export function surveySectors(seed: number): readonly AtlasSector[] {
  return NAMES.map((name, id) => {
    const center = sectorCenter(id);
    const hits: Record<Ground, number> = {
      grass: 0, forest: 0, path: 0, sand: 0, water: 0,
    };
    const step = WORLD_SPAN_TILES / 3;
    for (let y = -3; y <= 3; y++)
      for (let x = -3; x <= 3; x++) {
        const tx = Math.floor(center.x + x * step / 8);
        const ty = Math.floor(center.y + y * step / 8);
        hits[getTile(tx, ty, seed).ground]++;
      }
    const dominant = GROUNDS.reduce((best, ground) =>
      hits[ground] > hits[best] ? ground : best, "grass" as Ground);
    const middle = getTile(Math.floor(center.x), Math.floor(center.y), seed);
    const region = getWorldRegion(center.x, center.y);
    return { id, name, centerX: center.x, centerY: center.y, dominant,
      region, biome: middle.biome, regionName: REGIONS[region].name };
  });
}
export function atlasFrame(scale: AtlasScale, tileX: number, tileY: number,
  selectedSector = sectorIndex(tileX, tileY)): AtlasFrame {
  if (scale === "world") return { centerX: 0, centerY: 0, spanTiles: WORLD_SPAN_TILES };
  if (scale === "sector") {
    const sector = sectorCenter(selectedSector);
    return { centerX: sector.x, centerY: sector.y, spanTiles: WORLD_SPAN_TILES / 3 };
  }
  return { centerX: tileX, centerY: tileY, spanTiles: 128 };
}
