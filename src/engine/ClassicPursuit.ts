import type { Player } from "../actors/Player.ts";
import type { Slime } from "../actors/Slime.ts";
import type { CollisionMap } from "../world/collision.ts";
import { TILE_SIZE } from "../world/terrain.ts";
import { ATTACK_REACH, canStrike } from "./combat.ts";
import { TapNavigator } from "./TapNavigator.ts";

/** CLASSIC-002: local-only follow logic for a single manually selected target.
 * It proposes movement vectors; Player.update remains the sole movement and
 * collision authority. No networking, teleportation, or extra damage.
 */
export const CLASSIC_FOLLOW_LIMIT = TILE_SIZE * 16;
// Stop inside actual melee reach, with margin for pathfinder waypoint tolerance.
export const CLASSIC_FOLLOW_STOP = ATTACK_REACH - 4;
const REPATH_SECONDS = 0.4;
const REPATH_DISTANCE = TILE_SIZE * 0.5;
const ZERO = { x: 0, y: 0 } as const;
type Point = Readonly<{ x: number; y: number }>;
type Creature = Pick<Slime, "id" | "x" | "y" | "hp">;

const finite = (point: Point): boolean =>
  Number.isFinite(point.x) && Number.isFinite(point.y);

/** Test attack reach using the direction to the target, never the last key. */
export function inClassicAttackPosition(
  player: Point, creature: Point, collision: CollisionMap,
): boolean {
  if (!finite(player) || !finite(creature)) return false;
  const dx = creature.x - player.x, dy = creature.y - player.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 0.01 || distance >= CLASSIC_FOLLOW_STOP) return false;
  return canStrike({
    ...player, faceX: dx / distance, faceY: dy / distance,
  }, creature, collision);
}

/** Search safe standing points around the target, not inside the creature. */
export function findClassicApproach(
  player: Point, creature: Point, collision: CollisionMap,
): Point | null {
  if (!finite(player) || !finite(creature) || !collision.canMove(player.x, player.y))
    return null;
  const distance = Math.hypot(player.x - creature.x, player.y - creature.y);
  if (distance > CLASSIC_FOLLOW_LIMIT || distance < 0.01) return null;

  // Candidate rings are anchored on the 32px world grid and slightly inside
  // melee reach. Nearby choices first minimize detours.
  const directions = Array.from({ length: 12 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 12;
    return {
      x: creature.x + Math.cos(angle) * (TILE_SIZE + 5),
      y: creature.y + Math.sin(angle) * (TILE_SIZE + 5),
    };
  });
  directions.sort((a, b) =>
    Math.hypot(a.x - player.x, a.y - player.y) -
    Math.hypot(b.x - player.x, b.y - player.y)
  );
  for (const point of directions) {
    if (!collision.canMove(point.x, point.y)) continue;
    if (!inClassicAttackPosition(point, creature, collision)) continue;
    // The navigator owns the A* computation. The chosen destination must be
    // line-of-sight valid from its final point to prevent wall-through swings.
    return point;
  }
  return null;
}

export class ClassicPursuit {
  private readonly navigator = new TapNavigator();
  private trackedId: string | null = null;
  private lastCreature: Point | null = null;
  private replanSeconds = 0;

  get destination(): Point | null { return this.navigator.target; }

  reset(): void {
    this.navigator.cancel();
    this.trackedId = null;
    this.lastCreature = null;
    this.replanSeconds = 0;
  }

  /** Suspends following while the player walks manually without losing focus. */
  suspend(): void {
    this.navigator.cancel();
    this.replanSeconds = 0;
  }

  direction(
    dt: number,
    player: Player,
    selectedId: string | null,
    mobs: ReadonlyMap<string, Creature>,
    collision: CollisionMap,
  ): Point {
    if (!Number.isFinite(dt) || dt <= 0 || !selectedId || player.hp <= 0) {
      this.reset();
      return ZERO;
    }
    const mob = mobs.get(selectedId);
    if (!mob || mob.hp <= 0 || !finite(mob) || !finite(player)) {
      this.reset();
      return ZERO;
    }
    if (this.trackedId !== selectedId) {
      this.reset();
      this.trackedId = selectedId;
    }
    if (inClassicAttackPosition(player, mob, collision)) {
      this.navigator.cancel();
      this.lastCreature = { x: mob.x, y: mob.y };
      this.replanSeconds = 0;
      return ZERO;
    }
    if (Math.hypot(mob.x - player.x, mob.y - player.y) > CLASSIC_FOLLOW_LIMIT) {
      this.navigator.cancel();
      return ZERO;
    }
    this.replanSeconds = Math.max(0, this.replanSeconds - Math.min(dt, 0.1));
    const moved = this.lastCreature !== null &&
      Math.hypot(mob.x - this.lastCreature.x, mob.y - this.lastCreature.y) >= REPATH_DISTANCE;
    if (this.replanSeconds === 0 || moved) {
      this.replanSeconds = REPATH_SECONDS;
      this.lastCreature = { x: mob.x, y: mob.y };
      // Try multiple safe tiles around the monster: a single blocked
      // destination must not abort a reachable pursuit.
      const first = findClassicApproach(player, mob, collision);
      let found = first !== null && this.navigator.go(player, first, collision);
      if (!found) {
        this.navigator.cancel();
        for (let n = 0; n < 12 && !found; n++) {
          const angle = Math.PI * 2 * n / 12;
          const point = { x: mob.x + Math.cos(angle) * (TILE_SIZE + 5),
            y: mob.y + Math.sin(angle) * (TILE_SIZE + 5) };
          if (!collision.canMove(point.x, point.y) ||
              !inClassicAttackPosition(point, mob, collision)) continue;
          found = this.navigator.go(player, point, collision);
        }
      }
      if (!found) this.navigator.cancel();
    }
    return this.navigator.direction(player, dt);
  }
}
