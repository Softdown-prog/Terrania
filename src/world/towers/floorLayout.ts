import { hash2 } from "../random.ts";

/**
 * Planta de um andar de torre (ADR 0020): salões retos em vez de galerias de caverna. Três
 * retângulos ligados — o salão da entrada (onde fica a escada de saída), a passagem e o salão do
 * topo (onde fica a escada que desce e, no último andar, o chefe) — e pilares quadrados sorteados.
 * Só desenha; quem usa o resultado é `CaveFloor`, que mantém colisão, escadas e povoamento.
 */
const HALLS = [
  { x0: 8, x1: 33, y0: 18, y1: 27 },  // salão da entrada: contém a escada de saída (21, 26)
  { x0: 18, x1: 24, y0: 10, y1: 18 }, // passagem de 7 tiles de largura
  { x0: 4, x1: 36, y0: 4, y1: 11 },   // salão do topo: contém a clareira da escada (8, 8)
] as const;

/** Onde pode haver pilar: dentro dos salões, longe das escadas e da passagem. */
const PILLAR_SPOTS = [
  [11, 20], [14, 24], [27, 20], [30, 24], [12, 24], [29, 20],
  [14, 5], [18, 9], [26, 5], [30, 9], [33, 5], [22, 5], [15, 9], [27, 9],
] as const;

export function carveTowerFloor(carve: (x: number, y: number, cell?: 0 | 1) => void, salt: number): void {
  for (const hall of HALLS)
    for (let y = hall.y0; y <= hall.y1; y++)
      for (let x = hall.x0; x <= hall.x1; x++) carve(x, y, 1);
  for (const [i, [px, py]] of PILLAR_SPOTS.entries()) {
    if (hash2(px, py, salt + 4421 + i) < 0.42) continue;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) carve(px + dx, py + dy, 0);
  }
}
