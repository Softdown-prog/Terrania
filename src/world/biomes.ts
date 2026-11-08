import { getTerrainProfile, type TerrainProfile } from "./terrainProfiles.ts";
export type Biome = "meadow" | "woodland" | "trail" | "tundra" | "snowfield" |
  "frozen-lake" | "dunes" | "oasis" | "ruins" | "beach" | "island" |
  "open-sea" | "highlands" | "stone-peak" | "volcanic";
export const BIOME_NAMES: Readonly<Record<Biome, string>> = {
  meadow: "Campos Temperados", woodland: "Floresta Temperada", trail: "Trilha",
  tundra: "Tundra Nevada", snowfield: "Neve Profunda", "frozen-lake": "Lago Gelado",
  dunes: "Dunas do Sul", oasis: "Oásis", ruins: "Ermos Antigos",
  beach: "Praia", island: "Ilhas Costeiras", "open-sea": "Mar Aberto",
  highlands: "Encostas", "stone-peak": "Picos Rochosos", volcanic: "Rocha Vulcânica",
};
/** Sem pontos de interesse falsos: biomas descrevem o terreno efetivamente gerado. */
export function classifyBiome(p: TerrainProfile): Biome {
  if (p.weights.north > 0.42 && p.temperature < 0.29)
    return p.altitude > 0.46 || p.humidity > 0.54 ? "snowfield" : "tundra";
  if (p.weights.south > 0.41 && p.humidity < 0.31)
    return p.humidity > 0.25 ? "oasis" : p.altitude > 0.55 ? "ruins" : "dunes";
  if (p.weights.east > 0.4) {
    if (p.coast > 0.61) return "open-sea";
    return p.coast > 0.34 ? "island" : "beach";
  }
  if (p.weights.west > 0.41)
    return p.altitude > 0.75 ? "stone-peak" :
      p.ruggedness > 0.74 && p.humidity < 0.36 ? "volcanic" : "highlands";
  if (p.temperature < 0.35) return p.altitude > 0.45 ? "snowfield" : "tundra";
  if (p.temperature > 0.76 && p.humidity < 0.30) return "dunes";
  return p.humidity > 0.54 ? "woodland" : "meadow";
}
export function getBiomeAt(x: number, y: number, seed: number): Biome {
  return classifyBiome(getTerrainProfile(x, y, seed));
}
