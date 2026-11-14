import { getSouthRuinForCell, RUIN_CELL_TILES } from "./southRuins.ts";
import { getSouthTowerForCell, TOWER_CELL_TILES } from "./towers/placement.ts";

/** A área de uma ruína ou de uma torre, em tiles a partir do ponto de contato: quanto ela se estende para cada lado, para cima e para baixo. */
export const RUIN_AREA = { side: 5, up: 3, down: 3 } as const;
export const TOWER_AREA = { side: 6, up: 5, down: 5 } as const;

/**
 * O tile (tx, ty) está na área de uma ruína ou de uma torre do Sul (ADR 0059)? As cavernas desviam dessas áreas, para uma
 * entrada nunca cair em cima da arte de uma ruína ou torre. É a ruína e a torre que mandam: a posição delas só depende do
 * terreno, dos marcos e uma da outra, nunca das cavernas, então não há ciclo. Só a célula do próprio tile precisa ser
 * consultada: o ponto de uma ruína fica a 24 tiles da borda da célula e o de uma torre, a 28, e a área delas é de 5 e 6 tiles.
 */
export function insideSiteFootprint(tx: number, ty: number, seed: number): boolean {
  if (![tx, ty, seed].every(Number.isSafeInteger)) return false;
  const ruin = getSouthRuinForCell(Math.floor(tx / RUIN_CELL_TILES), Math.floor(ty / RUIN_CELL_TILES), seed);
  if (ruin && Math.abs(tx - ruin.tileX) <= RUIN_AREA.side && ty >= ruin.tileY - RUIN_AREA.up && ty <= ruin.tileY + RUIN_AREA.down) return true;
  const tower = getSouthTowerForCell(Math.floor(tx / TOWER_CELL_TILES), Math.floor(ty / TOWER_CELL_TILES), seed);
  return !!tower && Math.abs(tx - tower.tileX) <= TOWER_AREA.side && ty >= tower.tileY - TOWER_AREA.up && ty <= tower.tileY + TOWER_AREA.down;
}
