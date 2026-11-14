/**
 * Capital dos povos humanos, no coração das Terras da Travessia (ADR 0055). Coordenadas fixas, independentes da semente,
 * na estrada norte-sul que sai da Vila da Travessia. Tudo aqui é O(1) por tile: não varre o mapa.
 *
 * Um tile de planta é "local" quando conta a partir do centro da cidade (a praça): `lx` para leste e `ly` para sul.
 */
export const CAPITAL = {
  /** Nome de trabalho: é só esta constante e o texto da documentação; pode ser trocado sem mexer em mais nada. */
  name: "Concórdia",
  /** Centro da praça, em tiles do mundo. O x fica entre as duas estradas da travessia que entram pelos portões. */
  centerX: -2, centerY: -800,
  /** Limites da muralha em tiles locais (80 × 64 tiles, a muralha incluída). */
  minX: -40, maxX: 39, minY: -32, maxY: 31,
  /** Os portões norte e sul abrem 9 tiles (|lx| ≤ 4): cabem as duas estradas da travessia, a reta e a que serpenteia. */
  gateHalf: 4,
  northGate: "Grande Portão do Norte", southGate: "Grande Portão do Sul",
  /** Faixa de terra limpa em volta da muralha, sem lago, margem de areia, mata, pedra nem caverna. */
  margin: 40,
} as const;

/** Tamanho do tile em pixels, o mesmo de `terrain.ts` (que importa este módulo, então não pode ser importado de lá; um teste confere). */
export const CAPITAL_TILE = 32;

/** Tile do mundo para tile local. */
export function capitalLocal(tx: number, ty: number): readonly [number, number] {
  return [tx - CAPITAL.centerX, ty - CAPITAL.centerY];
}

/** Centro (em pixels do mundo) do tile local (lx, ly). */
export function capitalPoint(lx: number, ly: number): { readonly x: number; readonly y: number } {
  return { x: (CAPITAL.centerX + lx + 0.5) * CAPITAL_TILE, y: (CAPITAL.centerY + ly + 0.5) * CAPITAL_TILE };
}

/** O tile local está dentro da muralha (ela incluída)? */
export function insideCapital(lx: number, ly: number): boolean {
  return lx >= CAPITAL.minX && lx <= CAPITAL.maxX && ly >= CAPITAL.minY && ly <= CAPITAL.maxY;
}
