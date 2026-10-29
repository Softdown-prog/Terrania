import { isWalkable, TILE_SIZE } from './terrain.ts';
/** Interface sem dependência de DOM, compartilhada entre navegador e servidor. */
export interface CollisionMap { canMove(x: number, y: number): boolean }
export function canMoveOnSeed(x: number, y: number, seed: number): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 1_000_000 || Math.abs(y) > 1_000_000) return false;
  const radius = 7;
  return [[-radius, -radius], [radius, -radius], [-radius, radius], [radius, radius]].every(([dx, dy]) =>
    isWalkable(Math.floor((x + dx) / TILE_SIZE), Math.floor((y + dy) / TILE_SIZE), seed));
}
export class SeedCollision implements CollisionMap {
  readonly seed: number;
  constructor(seed: number) { this.seed = seed; }
  canMove(x: number, y: number): boolean { return canMoveOnSeed(x, y, this.seed); }
}
