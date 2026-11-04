import type { Slime } from "../actors/Slime.ts";
import type { Player } from "../actors/Player.ts";
import type { CollisionMap } from "../world/collision.ts";
import { canStrike } from "./combat.ts";

/** Terrania's original classic-RPG prototype: target-and-wait, not an action combo.
 * Solo only. No browser, network, persistence or Go authority in this class.
 */
export const CLASSIC_ATTACK_INTERVAL = 1.6;
export const CLASSIC_SELECT_RADIUS = 24;
export const CLASSIC_NEAREST_RADIUS = 145;

type Point = Readonly<{ x: number; y: number }>;
type Target = Pick<Slime, "id" | "x" | "y" | "hp">;
const isPoint = (p: Point): boolean =>
  Number.isFinite(p.x) && Number.isFinite(p.y);

/** A selected target never authorizes an out-of-range or wall-penetrating strike. */
export class ClassicCombat {
  private selected: string | null = null;
  private remaining = 0;

  get targetId(): string | null { return this.selected; }
  get cooldown(): number { return this.remaining; }

  cancel(): void {
    this.selected = null;
    this.remaining = 0;
  }

  select(id: string, mobs: ReadonlyMap<string, Target>): boolean {
    const target = mobs.get(id);
    if (!target || target.hp <= 0) return false;
    // Switching targets is allowed, but cannot bypass an existing attack timer.
    this.selected = id;
    return true;
  }

  selectAt(at: Point, mobs: Iterable<Target>, radius = CLASSIC_SELECT_RADIUS): boolean {
    if (!isPoint(at) || !Number.isFinite(radius) || radius <= 0) return false;
    let nearest: Target | null = null;
    let best = radius;
    for (const mob of mobs) {
      if (mob.hp <= 0 || !isPoint(mob)) continue;
      const distance = Math.hypot(mob.x - at.x, mob.y - at.y);
      if (distance <= best) { nearest = mob; best = distance; }
    }
    if (!nearest) return false;
    this.selected = nearest.id;
    return true;
  }

  selectNearest(hero: Point, mobs: Iterable<Target>): boolean {
    return this.selectAt(hero, mobs, CLASSIC_NEAREST_RADIUS);
  }

  /** Call exactly once per fixed simulation tick, BEFORE sim.update.
   * The simulation still decides when the wind-up lands and grants loot/kills.
   */
  tick(dt: number, player: Player, mobs: ReadonlyMap<string, Target>,
      collision: CollisionMap): boolean {
    if (!Number.isFinite(dt) || dt <= 0) return false;
    this.remaining = Math.max(0, this.remaining - Math.min(dt, 0.1));
    if (!this.selected) return false;
    const mob = mobs.get(this.selected);
    if (!mob || mob.hp <= 0) { this.cancel(); return false; }
    if (player.hp <= 0 || !isPoint(mob) || !isPoint(player)) return false;
    const dx = mob.x - player.x, dy = mob.y - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 0.01 || distance >= 52 ||
        this.remaining > 0 || player.attackCooldown > 0) return false;
    const facing = {x:player.x,y:player.y,faceX:dx/distance,faceY:dy/distance};
    if (!canStrike(facing, mob, collision)) return false;
    player.faceX = facing.faceX;
    player.faceY = facing.faceY;
    this.remaining = CLASSIC_ATTACK_INTERVAL;
    return true;
  }

  label(mobs: ReadonlyMap<string, Target>): string | null {
    if (!this.selected) return null;
    const mob = mobs.get(this.selected);
    if (!mob || mob.hp <= 0) { this.cancel(); return null; }
    return "Slime";
  }
}
