import type { Player } from "../../actors/Player.ts";
import { moveBody, type CollisionMap } from "../../world/collision.ts";
import { TILE_SIZE } from "../../world/terrain.ts";
import { clearPath } from "./TapNavigator.ts";

type Point = Readonly<{ x: number; y: number }>;
/** Re-evaluated at each tile center, including centers reached within one tick. */
export type WalkDirection = Point | (() => Point);
type Step = { readonly from: Point; readonly to: Point; readonly distance: number; progress: number };
const STILL = { x: 0, y: 0 } as const;
export const CLASSIC_WALK_SPEED = 126;

export function tileDirection({ x, y }: Point): Point {
  if (!Number.isFinite(x) || !Number.isFinite(y) || Math.hypot(x, y) < 0.08) return STILL;
  const threshold = Math.max(Math.abs(x), Math.abs(y)) * 0.4;
  return {
    x: Math.abs(x) >= threshold ? Math.sign(x) : 0,
    y: Math.abs(y) >= threshold ? Math.sign(y) : 0,
  };
}

/** Shared solo/server movement. A committed step finishes even after release;
 * unused tick time can start the next step, but is never saved for later input.
 * Player owns timers; this controller owns displacement and walking direction.
 */
export class ClassicTileWalker {
  private step: Step | null = null;
  get destination(): Point | null { return this.step?.to ?? null; }

  reset(): void { this.step = null; }

  /** Equal world speed in all eight directions and at different simulation rates. */
  advance(dt: number, direction: WalkDirection, player: Player, collision: CollisionMap): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    const time = Math.min(dt, 0.1);
    const attackRemaining = player.attackTime;
    const movementMultiplier = player.movementMultiplier;
    player.update(time, STILL, collision, true);
    if (player.hp <= 0) { this.reset(); return; }
    // A committed tile must pause (not finish) while frozen or stunned.
    if (movementMultiplier <= 0) {
      player.vx = player.vy = 0;
      return;
    }
    let elapsed = 0;
    // At normal speed a tick crosses at most one full tile boundary. The bound
    // also protects callers with a malformed/custom terrain speed multiplier.
    for (let segment = 0; elapsed < time - 1e-9 && segment < 16; segment++) {
      if (!this.step) {
        const { x: dx, y: dy } = tileDirection(typeof direction === "function" ? direction() : direction);
        if (dx === 0 && dy === 0) {
          player.vx = 0; player.vy = 0;
          return;
        }
        const length = Math.hypot(dx, dy);
        if (player.attackTime <= 0 && length > 0) {
          player.faceX = dx / length; player.faceY = dy / length;
        }
        const from = { x: player.x, y: player.y };
        const to = {
          x: (Math.floor(from.x / TILE_SIZE) + dx + 0.5) * TILE_SIZE,
          y: (Math.floor(from.y / TILE_SIZE) + dy + 0.5) * TILE_SIZE,
        };
        if (!clearPath(from, to, collision)) {
          player.vx = 0; player.vy = 0;
          return;
        }
        this.step = { from, to, distance: Math.hypot(to.x - from.x, to.y - from.y), progress: 0 };
      }
      const step = this.step;
      const attacking = attackRemaining - elapsed > 1e-9;
      const speed = CLASSIC_WALK_SPEED * movementMultiplier * (collision.speedAt?.(player.x, player.y) ?? 1) *
        (attacking ? 0.72 : 1);
      if (!Number.isFinite(speed) || speed <= 0 || step.distance <= 0) {
        this.reset(); player.vx = 0; player.vy = 0;
        return;
      }
      const timeToCenter = (1 - step.progress) * step.distance / speed;
      const slice = Math.min(time - elapsed, timeToCenter,
        attacking ? attackRemaining - elapsed : Infinity);
      const arrived = timeToCenter <= slice + 1e-9;
      step.progress = arrived ? 1 : step.progress + speed * slice / step.distance;
      const requested = {
        x: step.from.x + (step.to.x - step.from.x) * step.progress,
        y: step.from.y + (step.to.y - step.from.y) * step.progress,
      };
      const beforeX = player.x, beforeY = player.y;
      moveBody(player, requested.x - player.x, requested.y - player.y, collision);
      player.walkTime += Math.hypot(player.x - beforeX, player.y - beforeY) * 0.12;
      if (Math.hypot(player.x - requested.x, player.y - requested.y) > 0.5) {
        this.reset(); player.vx = 0; player.vy = 0;
        return;
      }
      const nx = (step.to.x - step.from.x) / step.distance;
      const ny = (step.to.y - step.from.y) / step.distance;
      player.vx = nx * speed; player.vy = ny * speed;
      // A swing may end halfway through a committed step. Restore the walking
      // direction immediately instead of waiting until another tile begins.
      if (player.attackTime <= 0) { player.faceX = nx; player.faceY = ny; }
      elapsed += slice;
      if (arrived) {
        player.x = step.to.x; player.y = step.to.y;
        this.reset();
      }
    }
  }
}
