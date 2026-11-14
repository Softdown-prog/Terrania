import { CAPITAL } from "./layout.ts";

/** Uma torre da capital: onde ela fica (tiles locais do canto de cima e à esquerda da base de 2 × 2), o tipo e se está no norte. */
export interface CapitalTower {
  readonly id: string; readonly kind: "corner" | "gate"; readonly lx: number; readonly ly: number;
}

/** O tamanho da base de uma torre, em tiles. */
export const TOWER_TILES = 2;

/** As oito torres (ADR 0056): uma em cada canto da muralha e duas de cada lado de cada portão. */
export const CAPITAL_TOWERS: readonly CapitalTower[] = (() => {
  const north = CAPITAL.minY, south = CAPITAL.maxY - TOWER_TILES + 1, west = CAPITAL.minX, east = CAPITAL.maxX - TOWER_TILES + 1;
  const left = -CAPITAL.gateHalf - TOWER_TILES, right = CAPITAL.gateHalf + 1;
  return [
    { id: "torre-noroeste", kind: "corner", lx: west, ly: north }, { id: "torre-nordeste", kind: "corner", lx: east, ly: north },
    { id: "torre-sudoeste", kind: "corner", lx: west, ly: south }, { id: "torre-sudeste", kind: "corner", lx: east, ly: south },
    { id: "torre-portao-norte-oeste", kind: "gate", lx: left, ly: north }, { id: "torre-portao-norte-leste", kind: "gate", lx: right, ly: north },
    { id: "torre-portao-sul-oeste", kind: "gate", lx: left, ly: south }, { id: "torre-portao-sul-leste", kind: "gate", lx: right, ly: south },
  ] as const;
})();

/** O tile local é parte da base de alguma torre? */
export function isCapitalTowerTile(lx: number, ly: number): boolean {
  return CAPITAL_TOWERS.some(t => lx >= t.lx && lx < t.lx + TOWER_TILES && ly >= t.ly && ly < t.ly + TOWER_TILES);
}
