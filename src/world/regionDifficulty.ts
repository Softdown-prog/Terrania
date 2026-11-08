import { REGIONS, getWorldRegion, type WorldRegion } from "./regions.ts";
export interface RegionalThreat {
  readonly region: WorldRegion;
  readonly tier: number;
  readonly encounterThemes: readonly string[];
  readonly landmarkThemes: readonly string[];
}
/** Dados de progressão; temas futuros NÃO são criaturas instanciadas. */
export function getRegionDifficulty(x: number, y: number): RegionalThreat {
  const region = getWorldRegion(x, y);
  return {
    region, tier: REGIONS[region].difficulty,
    encounterThemes: REGIONS[region].encounterThemes,
    landmarkThemes: REGIONS[region].landmarkThemes,
  };
}
