import type { Player } from "../actors/Player.ts";
import { moveBody, type CollisionMap } from "../world/collision.ts";
import { TILE_SIZE } from "../world/terrain.ts";
import { clearPath } from "./TapNavigator.ts";

type Point = Readonly<{ x: number; y: number }>;
type Step = { readonly from: Point; readonly to: Point; readonly distance: number; progress: number };
const STILL = { x: 0, y: 0 } as const;
export const CLASSIC_WALK_SPEED = 126;

/**
 * One committed 32px cell at a time in the solo game and tile-enabled rooms.
 * A step animates smoothly, but its endpoint is always a world tile center.
 * No DOM, storage, server or Phaser dependency. The player's default update
 * still owns its combat/status timers; classic stepping owns position only.
 */
export class ClassicTileWalker {
  private step: Step | null = null;
  get destination(): Point | null { return this.step?.to ?? null; }

  reset(): void { this.step = null; }

  /** 8-direction input. Diagonal traversal costs sqrt(2) times a cardinal step. */
  advance(dt: number, dir: Point, player: Player, collision: CollisionMap): void {
    // Player still owns combat and status timers in both movement modes.
    player.update(dt, STILL, collision, true);
    if (!Number.isFinite(dt) || dt <= 0 || player.hp <= 0) {
      this.reset();
      return;
    }
    const time = Math.min(dt, 0.1);
    if (!this.step) {
      if (!Number.isFinite(dir.x) || !Number.isFinite(dir.y) ||
          Math.hypot(dir.x, dir.y) < 0.08) return;

      const max = Math.max(Math.abs(dir.x), Math.abs(dir.y));
      // Preserve deliberate diagonals, suppress tiny joystick noise.
      const dx = Math.abs(dir.x) >= max * 0.4 ? Math.sign(dir.x) : 0;
      const dy = Math.abs(dir.y) >= max * 0.4 ? Math.sign(dir.y) : 0;
      if (dx === 0 && dy === 0) return;

      // World-aligned tile centers: a legacy save may start off-center, but
      // the first legal step ends exactly on the neighboring 32px center.
      const from = { x: player.x, y: player.y };
      const to = {
        x: (Math.floor(from.x / TILE_SIZE) + dx + 0.5) * TILE_SIZE,
        y: (Math.floor(from.y / TILE_SIZE) + dy + 0.5) * TILE_SIZE,
      };
      if (!clearPath(from, to, collision)) return;
      this.step = { from, to, distance: Math.hypot(to.x - from.x, to.y - from.y), progress: 0 };
      if (player.attackTime <= 0) {
        const length = Math.hypot(dx, dy);
        player.faceX = dx / length;
        player.faceY = dy / length;
      }
    }
    const step = this.step;
    if (!step || step.distance <= 0) { this.reset(); return; }
    const speed = CLASSIC_WALK_SPEED *
      (collision.speedAt?.(player.x, player.y) ?? 1) *
      (player.attackTime > 0 ? 0.72 : 1);
    if (!Number.isFinite(speed) || speed <= 0) { this.reset(); return; }
    step.progress = Math.min(1, step.progress + speed * time / step.distance);
    const requested = {
      x: step.from.x + (step.to.x - step.from.x) * step.progress,
      y: step.from.y + (step.to.y - step.from.y) * step.progress,
    };
    const beforeX = player.x, beforeY = player.y;
    moveBody(player, requested.x - player.x, requested.y - player.y, collision);
    const traveled = Math.hypot(player.x - beforeX, player.y - beforeY);
    player.walkTime += traveled * 0.12;
    if (Math.hypot(player.x - requested.x, player.y - requested.y) > 0.5) {
      // A moving/changed collision source is never bypassed by a cached step.
      this.reset();
      player.vx = 0;
      player.vy = 0;
      return;
    }
    player.vx = (step.to.x - step.from.x) / step.distance * speed;
    player.vy = (step.to.y - step.from.y) / step.distance * speed;
    if (step.progress === 1) {
      player.x = step.to.x;
      player.y = step.to.y;
      this.reset();
      player.vx = 0;
      player.vy = 0;
    }
  }
}
