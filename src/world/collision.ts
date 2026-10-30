import { getTile, isWalkable, TILE_SIZE } from "./terrain.ts";
import { landmarkBlocks } from "./landmarks.ts";
import { villageBlocks } from "./village.ts";
/** Interface sem dependência de DOM, compartilhada entre navegador e servidor. */
export interface CollisionMap {
  canMove(x: number, y: number): boolean;
  speedAt?(x: number, y: number): number;
}
/** Small swept steps prevent crossing obstacles, including during knockback. */
export function moveBody(
  body: { x: number; y: number },
  dx: number,
  dy: number,
  world: CollisionMap,
): void {
  const steps = Math.max(
    1,
    Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 4),
  );
  for (let i = 0; i < steps; i++) {
    if (world.canMove(body.x + dx / steps, body.y)) body.x += dx / steps;
    if (world.canMove(body.x, body.y + dy / steps)) body.y += dy / steps;
  }
}
export function canMoveOnSeed(x: number, y: number, seed: number): boolean {
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    Math.abs(x) > 1_000_000 ||
    Math.abs(y) > 1_000_000
  )
    return false;
  const radius = 7;
  if (landmarkBlocks(x, y, radius) || villageBlocks(x, y, radius)) return false;
  return [
    [-radius, -radius],
    [radius, -radius],
    [-radius, radius],
    [radius, radius],
  ].every(([dx, dy]) =>
    isWalkable(
      Math.floor((x + dx) / TILE_SIZE),
      Math.floor((y + dy) / TILE_SIZE),
      seed,
    ),
  );
}
export class SeedCollision implements CollisionMap {
  readonly seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  canMove(x: number, y: number): boolean {
    return canMoveOnSeed(x, y, this.seed);
  }
  speedAt(x: number, y: number): number {
    const ground = getTile(
      Math.floor(x / TILE_SIZE),
      Math.floor(y / TILE_SIZE),
      this.seed,
    ).ground;
    return ground === "sand" ? 0.82 : ground === "forest" ? 0.94 : 1;
  }
}
