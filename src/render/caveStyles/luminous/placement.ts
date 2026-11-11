import { hash2 } from "../../../world/random.ts";
import { TILE_SIZE } from "../../../world/terrain.ts";
import type { CaveFloor } from "../../../world/caveFloor.ts";
import { CAVE_HEIGHT, CAVE_WIDTH } from "../../../world/caveFloor.ts";

/** Uma peça da Gruta Luminosa no andar: o que é, onde (px do andar) e a variação do desenho. */
export interface LuminousPiece {
  readonly kind: "pool" | "mushroom";
  readonly x: number;
  readonly y: number;
  readonly variation: number;
}

/** Fração dos cantos junto à parede que ganham touceira de cogumelos. */
export const MUSHROOM_SHARE = 0.38;

/**
 * Onde ficam as poças e os cogumelos de um andar (ADR 0032). Sai só do mapa e da semente do andar: poça
 * no meio do chão aberto, cogumelos junto às paredes, ambos dentro do próprio tile. A ordem devolvida é a
 * de pintura (de trás para frente), porque o halo passa do tile e os vizinhos não podem cobri-lo.
 */
export function luminousPieces(floor: CaveFloor, seed: number): LuminousPiece[] {
  const n = (x: number, y: number, salt: number): number => hash2(x, y, seed + salt);
  const open = (x: number, y: number): boolean => floor.at(x, y) !== 0;
  const pieces: LuminousPiece[] = [];
  for (let y = 0; y < CAVE_HEIGHT; y++) for (let x = 0; x < CAVE_WIDTH; x++) {
    if (floor.at(x, y) !== 1) continue;
    const sx = x * TILE_SIZE, sy = y * TILE_SIZE, fine = n(x, y, 37);
    if (fine > .8 && n(x, y, 131) > .3) pieces.push({ kind: "pool", x: sx + 16, y: sy + 17, variation: n(x, y, 137) });
    const besideWall = !open(x, y + 1) || !open(x - 1, y) || !open(x + 1, y);
    if (!besideWall || n(x, y, 107) < 1 - MUSHROOM_SHARE) continue;
    pieces.push({ kind: "mushroom", x: sx + 7 + n(x, y, 113) * 17, y: sy + 11 + n(x, y, 119) * 14 + 3, variation: fine });
  }
  return pieces.sort((a, b) => a.y - b.y || a.x - b.x);
}
