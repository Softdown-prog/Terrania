import type { CollisionMap } from '../world/collision.ts';
import { hash2 } from '../world/random.ts';
import { CHUNK_TILES, TILE_SIZE } from '../world/terrain.ts';
import type { Player } from './Player.ts';
export class Slime {
  hp = 2; x: number; y: number; private pulse = 0; contactCooldown = 0;
  readonly id: string;
  constructor(id: string, x: number, y: number) { this.id = id; this.x = x; this.y = y; }
  update(dt: number, player: Player, world: CollisionMap): void {
    this.pulse += dt * 5;
    this.contactCooldown = Math.max(0, this.contactCooldown - dt);
    const dx = player.x - this.x, dy = player.y - this.y, d = Math.hypot(dx, dy);
    if (d < 230 && d > 16) {
      const moveX = dx / d * 38 * dt, moveY = dy / d * 38 * dt;
      if (world.canMove(this.x + moveX, this.y)) this.x += moveX;
      if (world.canMove(this.x, this.y + moveY)) this.y += moveY;
    }
    if (d < 24 && this.contactCooldown === 0) { player.hp = Math.max(0, player.hp - 9); this.contactCooldown = 1.2; }
  }
  get bounce(): number { return Math.sin(this.pulse); }
}
export function slimeSpawns(cx: number, cy: number, seed: number): Slime[] {
  const count = hash2(cx, cy, seed + 201) < 0.53 ? 1 : 2;
  const result: Slime[] = [];
  for (let index = 0; index < count; index++) {
    const tx = cx * CHUNK_TILES + Math.floor(hash2(cx * 4 + index, cy, seed + 77) * CHUNK_TILES);
    const ty = cy * CHUNK_TILES + Math.floor(hash2(cx, cy * 4 + index, seed + 97) * CHUNK_TILES);
    if (Math.hypot(tx, ty) < 9 || !worldTileWalkable(tx, ty, seed)) continue;
    result.push(new Slime(cx + ',' + cy + ',' + index, (tx + .5) * TILE_SIZE, (ty + .5) * TILE_SIZE));
  }
  return result;
}
import { isWalkable as worldTileWalkable } from '../world/terrain.ts';
