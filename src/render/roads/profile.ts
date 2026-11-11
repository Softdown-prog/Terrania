import { ROAD_MARGIN, type RoadMask } from "./mask.ts";
import type { RoadAxis } from "./types.ts";

/** O que se sabe de um tile de estrada: para onde ela corre, que largura tem e onde o tile está nela. */
export interface RoadProfile {
  readonly axis: RoadAxis;
  /** Largura da estrada no sentido transversal, em tiles (1 a 2 × ROAD_MARGIN + 1). */
  readonly widthTiles: number;
  /** Distância do centro do tile ao eixo da estrada, no sentido transversal, em tiles (positivo = à direita/abaixo). */
  readonly offsetTiles: number;
}

/** Tiles seguidos de estrada a partir do vizinho, na direção (dx, dy), até ROAD_MARGIN. */
function run(mask: RoadMask, lx: number, ly: number, dx: number, dy: number): number {
  let n = 0;
  while (n < ROAD_MARGIN && mask.at(lx + dx * (n + 1), ly + dy * (n + 1))) n++;
  return n;
}

/** Quanto mais comprida que larga a estrada precisa ser para ter uma direção. */
const MIN_LENGTH_GAIN = 4;

/**
 * Direção, largura e posição lateral de um tile (ADR 0034), medidas pelas sequências de estrada em cada eixo.
 * Funciona com estrada larga (3 a 6 tiles, das rotas que se sobrepõem), em que todos os vizinhos do meio também
 * são estrada. Cruzamento (as duas sequências compridas) e ponta ou curva (as duas curtas) não têm direção.
 */
export function roadProfile(mask: RoadMask, lx: number, ly: number): RoadProfile {
  if (!mask.at(lx, ly)) return { axis: "patch", widthTiles: 1, offsetTiles: 0 };
  const left = run(mask, lx, ly, -1, 0), right = run(mask, lx, ly, 1, 0);
  const up = run(mask, lx, ly, 0, -1), down = run(mask, lx, ly, 0, 1);
  const across = left + right + 1, along = up + down + 1;
  if (across <= ROAD_MARGIN && along >= across + MIN_LENGTH_GAIN)
    return { axis: "vertical", widthTiles: across, offsetTiles: (left - right) / 2 };
  if (along <= ROAD_MARGIN && across >= along + MIN_LENGTH_GAIN)
    return { axis: "horizontal", widthTiles: along, offsetTiles: (up - down) / 2 };
  return { axis: across > ROAD_MARGIN && along > ROAD_MARGIN ? "junction" : "patch", widthTiles: Math.min(across, along), offsetTiles: 0 };
}
