import { hash2 } from "../../../world/random.ts";
import { TILE_SIZE } from "../../../world/terrain.ts";
import type { CaveFloor } from "../../../world/caveFloor.ts";
import { CAVE_HEIGHT, CAVE_WIDTH } from "../../../world/caveFloor.ts";

/** Uma peça da Gruta Luminosa no andar: o que é, onde (px do andar) e a variação do desenho. */
export interface LuminousPiece {
  readonly kind: "pool" | "puddle" | "ring" | "mushroom";
  readonly x: number;
  readonly y: number;
  readonly variation: number;
}

/** Fração dos cantos junto à parede que ganham touceira de cogumelos. */
export const MUSHROOM_SHARE = 0.38;
/** De cada dez peças do chão: musgo até este limite, poça de água até o seguinte e, no resto, círculo de cogumelos. */
export const MOSS_SHARE = 0.5, PUDDLE_SHARE = 0.8;
/** Fração das peças do chão que ganha uma companheira menor ao lado (tapetes que se juntam em manchas). */
export const COMPANION_SHARE = 0.15;

/**
 * Onde ficam as poças e os cogumelos de um andar (ADR 0032 e 0052). Sai só do mapa e da semente do andar. As peças do chão
 * (musgo, água ou círculo de cogumelos) ficam em tiles cercados de chão aberto, em qualquer ponto do miolo do tile (não no
 * centro), e algumas ganham uma companheira ao lado; cogumelos soltos ficam junto às paredes. Tudo dentro do próprio tile.
 * A ordem devolvida é a de pintura (de trás para frente), porque o halo passa do tile e os vizinhos não podem cobri-lo.
 */
export function luminousPieces(floor: CaveFloor, seed: number): LuminousPiece[] {
  const n = (x: number, y: number, salt: number): number => hash2(x, y, seed + salt);
  const open = (x: number, y: number): boolean => floor.at(x, y) !== 0;
  const pieces: LuminousPiece[] = [];
  for (let y = 0; y < CAVE_HEIGHT; y++) for (let x = 0; x < CAVE_WIDTH; x++) {
    if (floor.at(x, y) !== 1) continue;
    const sx = x * TILE_SIZE, sy = y * TILE_SIZE, fine = n(x, y, 37);
    const inland = open(x - 1, y) && open(x + 1, y) && open(x, y - 1) && open(x, y + 1);
    if (fine > .8 && n(x, y, 131) > .3 && inland) {
      const pick = n(x, y, 139), px = sx + 9 + n(x, y, 141) * 14, py = sy + 10 + n(x, y, 143) * 14;
      pieces.push({ kind: pick < MOSS_SHARE ? "pool" : pick < PUDDLE_SHARE ? "puddle" : "ring", x: px, y: py, variation: n(x, y, 137) });
      if (n(x, y, 147) < COMPANION_SHARE)
        pieces.push({ kind: "pool", x: Math.max(sx + 6, Math.min(sx + 26, px + (n(x, y, 151) - .5) * 20)), y: Math.max(sy + 8, Math.min(sy + 26, py + 5 + n(x, y, 153) * 5)), variation: n(x, y, 149) });
    }
    const besideWall = !open(x, y + 1) || !open(x - 1, y) || !open(x + 1, y);
    if (!besideWall || n(x, y, 107) < 1 - MUSHROOM_SHARE) continue;
    pieces.push({ kind: "mushroom", x: sx + 7 + n(x, y, 113) * 17, y: sy + 11 + n(x, y, 119) * 14 + 3, variation: fine });
  }
  return pieces.sort((a, b) => a.y - b.y || a.x - b.x);
}
