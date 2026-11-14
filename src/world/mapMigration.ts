import { ANTES, MAP_VERSION, SOUTH_CITY_DISTANCE_TILES } from "./mapSize.ts";
import { TILE_SIZE } from "./terrain.ts";

/** Até onde, em px, a cidade do Poço Negro do mapa antigo e as estradas dela chegavam do centro: 100 tiles para cada lado. */
const OLD_CITY_REACH = 100 * TILE_SIZE;
/** Quanto o Poço Negro andou para o norte, em px (do mapa antigo para o novo). */
const CITY_SHIFT = (ANTES.southCityDistanceTiles - SOUTH_CITY_DISTANCE_TILES) * TILE_SIZE;

/**
 * Leva um ponto (em px) de um save do mapa antigo para o novo (ADR 0059). Só o Poço Negro mudou de lugar de verdade (foi para
 * mais perto, na mesma estrada); a Vila e a capital ficaram onde estavam. Quem estava na cidade antiga, ou nas estradas dela,
 * vai para o mesmo ponto da cidade nova. O resto do mapa antigo ou ainda existe (e o ponto fica) ou ficou além da parede
 * invisível, e aí quem carrega o save já devolve o herói ao ponto inicial.
 */
export function migrateMapPoint(x: number, y: number): { x: number; y: number } {
  // Número inválido (NaN, infinito) nunca cai dentro do retângulo abaixo e por isso fica como está.
  const oldCenterY = (ANTES.southCityDistanceTiles + 0.5) * TILE_SIZE;
  if (Math.abs(x) <= OLD_CITY_REACH && Math.abs(y - oldCenterY) <= OLD_CITY_REACH) return { x, y: y - CITY_SHIFT };
  return { x, y };
}

/** Um save precisa de migração quando não traz a versão atual do tamanho do mapa (todo save anterior à redução). */
export const needsMapMigration = (version: unknown): boolean => version !== MAP_VERSION;
