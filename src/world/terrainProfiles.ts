import { valueNoise } from "./random.ts";
import { getRegionWeights, getWorldRegion, type RegionWeights, type WorldRegion } from "./regions.ts";

export interface TerrainProfile {
  readonly region: WorldRegion;
  readonly weights: RegionWeights;
  readonly temperature: number;
  readonly humidity: number;
  readonly altitude: number;
  readonly coast: number;
  readonly ruggedness: number;
}
const clamp = (n: number): number => Math.max(0, Math.min(1, n));
const smooth = (a: number, b: number, n: number): number => {
  const v = clamp((n - a) / (b - a));
  return v * v * (3 - 2 * v);
};
/** Per-tile climate/elevation fields. Same seed and coordinates in browser and Node. */
export function getTerrainProfile(x: number, y: number, seed: number): TerrainProfile {
  const weights = getRegionWeights(x, y);
  const wide = valueNoise(x / 230, y / 230, seed + 541);
  const moisture = valueNoise(x / 170, y / 170, seed + 379);
  const ridge = valueNoise(x / 105, y / 105, seed + 677);
  return {
    region: getWorldRegion(x, y),
    weights,
    temperature: clamp(0.56 - weights.north * 0.7 + weights.south * 0.42 -
      weights.west * 0.09 + (wide - 0.5) * 0.14),
    humidity: clamp(0.52 + weights.north * 0.10 + weights.east * 0.13 -
      weights.south * 0.47 - weights.west * 0.14 + (moisture - 0.5) * 0.44),
    altitude: clamp(0.36 + weights.west * 0.5 - weights.east * 0.22 +
      (ridge - 0.5) * 0.47),
    coast: clamp(weights.east * smooth(7100, 23000, x) +
      (wide - 0.5) * weights.east * 0.28),
    ruggedness: clamp(weights.west * 0.7 + (ridge - 0.5) * 0.48),
  };
}
