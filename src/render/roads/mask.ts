/** Quantos tiles além do chunk a máscara enxerga: a estrada mais larga que se mede tem 2 × 8 + 1 tiles. */
export const ROAD_MARGIN = 8;

/** Mapa de "é estrada" de um chunk e da vizinhança, para medir direção e largura sem consultar o mundo de novo. */
export interface RoadMask {
  /** Tile local (`lx`, `ly` de -ROAD_MARGIN a chunkTiles + ROAD_MARGIN - 1); fora disso, nunca é estrada. */
  at(lx: number, ly: number): boolean;
}

/**
 * Monta a máscara de um chunk (ADR 0034). `isRoadAt` recebe a posição global em tiles; quem chama decide o que
 * conta como estrada (o pintor de terreno passa "o chão é caminho"). Só é montada quando o chunk tem estrada.
 */
export function buildRoadMask(chunkX: number, chunkY: number, chunkTiles: number,
  isRoadAt: (tx: number, ty: number) => boolean): RoadMask {
  const span = chunkTiles + ROAD_MARGIN * 2;
  const cells = new Uint8Array(span * span);
  for (let y = 0; y < span; y++) for (let x = 0; x < span; x++)
    if (isRoadAt(chunkX * chunkTiles + x - ROAD_MARGIN, chunkY * chunkTiles + y - ROAD_MARGIN)) cells[y * span + x] = 1;
  return {
    at(lx: number, ly: number): boolean {
      const x = lx + ROAD_MARGIN, y = ly + ROAD_MARGIN;
      return x >= 0 && y >= 0 && x < span && y < span && cells[y * span + x] === 1;
    },
  };
}
