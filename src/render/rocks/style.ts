import type { Biome } from "../../world/biomes.ts";
import type { RockStyle } from "./types.ts";

/** Biomas de deserto: a pedra é de arenito, sem musgo. Os demais mantêm a pedra de sempre. */
const SANDSTONE_BIOMES: ReadonlySet<Biome> = new Set<Biome>(["dunes", "ruins"]);

/** Qual estilo de pedra o bioma pede. */
export function rockStyleFor(biome: Biome): RockStyle {
  return SANDSTONE_BIOMES.has(biome) ? "sandstone" : "moss";
}
