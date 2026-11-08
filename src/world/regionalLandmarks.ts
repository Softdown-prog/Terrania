import { hash2 } from "./random.ts";
import { getWorldRegion, type WorldRegion } from "./regions.ts";
import { isWalkable, TILE_SIZE } from "./terrain.ts";

/** Marcos geográficos reais, sem missões ou entradas de dungeon fictícias. */
export const LANDMARK_CELL_TILES = 256;
export type RegionalLandmarkKind = "ice-spire" | "desert-obelisk" | "coast-beacon" | "mountain-monolith";
export interface RegionalLandmark {
  readonly id: string;
  readonly kind: RegionalLandmarkKind;
  readonly name: string;
  readonly region: Exclude<WorldRegion, "center">;
  readonly tileX: number;
  readonly tileY: number;
  readonly x: number;
  readonly y: number;
  readonly variant: number;
}
const THEMES: Record<Exclude<WorldRegion, "center">, {kind: RegionalLandmarkKind; name: string}> = {
  north: { kind: "ice-spire", name: "Agulha de Gelo" },
  south: { kind: "desert-obelisk", name: "Obelisco Soterrado" },
  east: { kind: "coast-beacon", name: "Farol Abandonado" },
  west: { kind: "mountain-monolith", name: "Monólito da Montanha" },
};

/** Primeiro escolhe uma coordenada dentro da célula; 40 tiles de margem isolam colisões. */
function candidate(cellX: number, cellY: number, seed: number): {tx: number; ty: number} | null {
  if (!Number.isSafeInteger(cellX) || !Number.isSafeInteger(cellY)) return null;
  if (hash2(cellX, cellY, seed + 1703) >= 0.38) return null;
  return {
    tx: cellX * LANDMARK_CELL_TILES + 40 +
      Math.floor(hash2(cellX * 3, cellY, seed + 1711) * 176),
    ty: cellY * LANDMARK_CELL_TILES + 40 +
      Math.floor(hash2(cellX, cellY * 3, seed + 1733) * 176),
  };
}

/** Chamada somente nas células próximas à câmera ou ao jogador, nunca varre o mundo. */
export function getRegionalLandmarkForCell(cellX: number, cellY: number, seed: number): RegionalLandmark | null {
  const point = candidate(cellX, cellY, seed);
  if (!point) return null;
  const region = getWorldRegion(point.tx, point.ty);
  if (region === "center") return null;
  // Local real e transitável, com ao menos uma faixa de passagem em torno do marco.
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      if (!isWalkable(point.tx + dx, point.ty + dy, seed)) return null;
  const theme = THEMES[region];
  return {
    id: `regional:${cellX}:${cellY}`,
    kind: theme.kind,
    name: theme.name,
    region,
    tileX: point.tx, tileY: point.ty,
    x: (point.tx + 0.5) * TILE_SIZE,
    y: (point.ty + 0.5) * TILE_SIZE,
    variant: hash2(cellX, cellY, seed + 1751),
  };
}

/** Não computa terreno caro nas centenas de chamadas de colisão longe do candidato. */
export function regionalLandmarkBlocks(x: number, y: number, radius: number, seed: number): boolean {
  const cellX = Math.floor(Math.floor(x / TILE_SIZE) / LANDMARK_CELL_TILES);
  const cellY = Math.floor(Math.floor(y / TILE_SIZE) / LANDMARK_CELL_TILES);
  const point = candidate(cellX, cellY, seed);
  if (!point) return false;
  const px = (point.tx + 0.5) * TILE_SIZE, py = (point.ty + 0.5) * TILE_SIZE;
  if (Math.abs(x - px) >= radius + 16 || Math.abs(y - py) >= radius + 16) return false;
  const landmark = getRegionalLandmarkForCell(cellX, cellY, seed);
  return landmark !== null && Math.hypot(x - landmark.x, y - landmark.y) < radius + 14;
}
