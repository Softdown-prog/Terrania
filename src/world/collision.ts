import { getTile, isWalkable, TILE_SIZE } from "./terrain.ts";
import { landmarkBlocks } from "./landmarks.ts";
import { villageBlocks } from "./village.ts";
/** Limite técnico por eixo da colisão, não uma fronteira geográfica desenhada. */
export const WORLD_EDGE_PIXELS = 1_000_000;
/** Interface sem dependência de DOM, compartilhada entre navegador e servidor. */
export interface CollisionMap {
  canMove(x: number, y: number): boolean;
  speedAt?(x: number, y: number): number;
}

/** Verifica um segmento a cada 4 unidades, incluindo as duas pontas. */
export function clearPath(
  from: { readonly x: number; readonly y: number },
  to: { readonly x: number; readonly y: number },
  collision: CollisionMap,
): boolean {
  if (![from.x, from.y, to.x, to.y].every(Number.isFinite)) return false;
  const dx = to.x - from.x, dy = to.y - from.y;
  const count = Math.ceil(Math.hypot(dx, dy) / 4);
  for (let i = 0; i <= count; i++) {
    const t = count === 0 ? 0 : i / count;
    if (!collision.canMove(from.x + dx * t, from.y + dy * t)) return false;
  }
  return true;
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
    Math.abs(x) > WORLD_EDGE_PIXELS ||
    Math.abs(y) > WORLD_EDGE_PIXELS
  )
    return false;
  const radius = 7;
  if (landmarkBlocks(x, y, radius) || villageBlocks(x, y, radius)) return false;
  return ([
    [-radius, -radius],
    [radius, -radius],
    [-radius, radius],
    [radius, radius],
  ] as const).every(([dx, dy]) =>
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
    const tile = getTile(
      Math.floor(x / TILE_SIZE),
      Math.floor(y / TILE_SIZE),
      this.seed,
).
    return tile.biome === "snowfield" || tile.biome === "stone-peak" ? 0.78 :
      tile.biome === "dunes" ? 0.83 : tile.ground === "sand" ? 0.82 :
      tile.ground === "forest" ? 0.94 : 1;
  }
}
