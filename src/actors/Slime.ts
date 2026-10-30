import { moveBody, type CollisionMap } from "../world/collision.ts";
import { hash2 } from "../world/random.ts";
import { CHUNK_TILES, TILE_SIZE } from "../world/terrain.ts";
import { villageGround } from "../world/village.ts";
import type { Player } from "./Player.ts";
export class Slime {
  hp = 2;
  x: number;
  y: number;
  private pulse = 0;
  contactCooldown = 0;
  hurtTime = 0;
  private knockX = 0;
  private knockY = 0;
  readonly id: string;
  constructor(id: string, x: number, y: number) {
    this.id = id;
    this.x = x;
    this.y = y;
  }
  update(dt: number, player: Player, world: CollisionMap): void {
    this.pulse += dt * 5;
    this.hurtTime = Math.max(0, this.hurtTime - dt);
    moveBody(this, this.knockX * dt, this.knockY * dt, world);
    this.knockX *= Math.exp(-10 * dt);
    this.knockY *= Math.exp(-10 * dt);
    this.contactCooldown = Math.max(0, this.contactCooldown - dt);
    // A cidade inicial é segura também na simulação autoritativa do servidor.
    if (villageGround(Math.floor(player.x / TILE_SIZE), Math.floor(player.y / TILE_SIZE))) return;
    const dx = player.x - this.x,
      dy = player.y - this.y,
      d = Math.hypot(dx, dy);
    if (d < 230 && d > 16) {
      const speed = 38 * (0.65 + 0.35 * Math.max(0, Math.sin(this.pulse)));
      if (this.hurtTime <= 0)
        moveBody(this, (dx / d) * speed * dt, (dy / d) * speed * dt, world);
    }
    if (d < 24 && this.contactCooldown === 0) {
      player.takeDamage(9, this.x, this.y);
      this.contactCooldown = 1.2;
    }
  }
  takeHit(sourceX: number, sourceY: number): void {
    this.hp--;
    this.hurtTime = 0.22;
    const dx = this.x - sourceX,
      dy = this.y - sourceY,
      d = Math.hypot(dx, dy) || 1;
    this.knockX = (dx / d) * 170;
    this.knockY = (dy / d) * 170;
  }
  get bounce(): number {
    return Math.sin(this.pulse);
  }
}
export function slimeSpawns(cx: number, cy: number, seed: number): Slime[] {
  const count = hash2(cx, cy, seed + 201) < 0.53 ? 1 : 2;
  const result: Slime[] = [];
  for (let index = 0; index < count; index++) {
    const tx =
      cx * CHUNK_TILES +
      Math.floor(hash2(cx * 4 + index, cy, seed + 77) * CHUNK_TILES);
    const ty =
      cy * CHUNK_TILES +
      Math.floor(hash2(cx, cy * 4 + index, seed + 97) * CHUNK_TILES);
    if (Math.hypot(tx, ty) < 9 || villageGround(tx, ty) || !worldTileWalkable(tx, ty, seed)) continue;
    result.push(
      new Slime(
        cx + "," + cy + "," + index,
        (tx + 0.5) * TILE_SIZE,
        (ty + 0.5) * TILE_SIZE,
      ),
    );
  }
  return result;
}
import { isWalkable as worldTileWalkable } from "../world/terrain.ts";
