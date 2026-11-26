import type { CollisionMap } from "./collision.ts";
import { CAVE_HEIGHT, CAVE_WIDTH } from "./caveFloor.ts";
import { TILE_SIZE } from "./terrain.ts";

/**
 * Onde o herói chega a pé num andar de caverna, a partir de `from` (busca em largura sobre os tiles que a colisão deixa pisar). Serve para não colocar criatura em
 * bolsão isolado (uma ilha cercada de água funda, uma câmara fechada), onde ninguém a alcançaria: o sorteio de pontos de `CaveRoom` e de `CaveCentral` só usa chão
 * alcançável. Devolve um teste por posição em pixels.
 */
export function caveReach(collision: CollisionMap, from: { readonly x: number; readonly y: number }): (x: number, y: number) => boolean {
  const key = (tx: number, ty: number): number => ty * CAVE_WIDTH + tx;
  const walkable = (tx: number, ty: number): boolean => tx >= 0 && ty >= 0 && tx < CAVE_WIDTH && ty < CAVE_HEIGHT && collision.canMove((tx + .5) * TILE_SIZE, (ty + .5) * TILE_SIZE);
  const start = { x: Math.floor(from.x / TILE_SIZE), y: Math.floor(from.y / TILE_SIZE) };
  const seen = new Set<number>([key(start.x, start.y)]), queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const at = queue[i]!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const next = { x: at.x + dx, y: at.y + dy };
      if (!seen.has(key(next.x, next.y)) && walkable(next.x, next.y)) { seen.add(key(next.x, next.y)); queue.push(next); }
    }
  }
  return (x, y) => {
    const tx = Math.floor(x / TILE_SIZE), ty = Math.floor(y / TILE_SIZE);
    return tx >= 0 && ty >= 0 && tx < CAVE_WIDTH && ty < CAVE_HEIGHT && seen.has(key(tx, ty)); // fora do andar nunca (a chave de um tile de fora repetiria a de um de dentro)
  };
}
