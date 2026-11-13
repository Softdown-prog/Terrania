import { hash2 } from "../../world/random.ts";
import { TILE_SIZE } from "../../world/terrain.ts";
import type { CaveFloor } from "../../world/caveFloor.ts";
import { CAVE_HEIGHT, CAVE_WIDTH } from "../../world/caveFloor.ts";

/** Uma formação no andar: onde está a base (px do andar) e a variação do desenho. */
export interface FormationPiece {
  readonly x: number;
  readonly y: number;
  readonly variation: number;
}

/** Fração dos tiles junto à parede que ganha uma formação. */
export const FORMATION_SHARE = 0.21;

/**
 * Onde ficam as formações de um andar (ADR 0053). Sai só do mapa e da semente: um tile de chão encostado em parede (ao sul, a
 * oeste ou a leste) ganha uma formação em `FORMATION_SHARE` dos casos, com a base em qualquer ponto do miolo do tile. É só
 * aparência e não muda a colisão. A ordem devolvida é a de pintura (de trás para frente), porque as formações passam do tile.
 */
export function formationPieces(floor: CaveFloor, seed: number): FormationPiece[] {
  const n = (x: number, y: number, salt: number): number => hash2(x, y, seed + salt);
  const open = (x: number, y: number): boolean => floor.at(x, y) !== 0;
  const pieces: FormationPiece[] = [];
  for (let y = 0; y < CAVE_HEIGHT; y++) for (let x = 0; x < CAVE_WIDTH; x++) {
    if (floor.at(x, y) !== 1) continue;
    const besideWall = !open(x, y + 1) || !open(x - 1, y) || !open(x + 1, y);
    if (!besideWall || n(x, y, 107) < 1 - FORMATION_SHARE) continue;
    pieces.push({ x: x * TILE_SIZE + 7 + n(x, y, 113) * 17, y: y * TILE_SIZE + 11 + n(x, y, 119) * 14 + 3, variation: n(x, y, 229) });
  }
  return pieces.sort((a, b) => a.y - b.y || a.x - b.x);
}
