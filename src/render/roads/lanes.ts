/** Largura de uma faixa de carroça, em tiles: uma estrada de até 4 tiles tem uma faixa e as largas têm várias. */
export const LANE_TILES = 3;
/** Metade da distância entre as duas rodas de uma carroça, em tiles (cerca de 13 px). */
export const GAUGE_TILES = 0.4;

/**
 * Posição das marcas de roda numa estrada de `widthTiles`, em tiles a partir do eixo (ADR 0034). Cada faixa
 * tem duas marcas, uma por roda, de um lado e do outro do centro da faixa. Os valores são sempre do mesmo
 * eixo, então tiles vizinhos da mesma estrada chegam às mesmas posições e as marcas se emendam.
 */
export function rutPositions(widthTiles: number): number[] {
  const width = Math.max(1, Math.floor(Number.isFinite(widthTiles) ? widthTiles : 1));
  const lanes = Math.max(1, Math.round(width / LANE_TILES));
  const out: number[] = [];
  for (let lane = 0; lane < lanes; lane++) {
    const center = ((lane + 0.5) / lanes - 0.5) * width;
    out.push(center - GAUGE_TILES, center + GAUGE_TILES);
  }
  return out;
}
