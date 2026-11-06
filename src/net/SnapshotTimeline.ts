import { TILE_SIZE } from "../world/terrain.ts";
import { ATTACK_DURATION } from "../engine/combat.ts";
import { CLASSIC_WALK_SPEED } from "../engine/ClassicTileWalker.ts";
import type { HeroState, MobState, WalkTarget } from "../shared/protocol.ts";

type Frame = { time: number; players: HeroState[]; mobs: MobState[] };
const TARGET_BUFFER = 0.18;
const MAX_RATE_ADJUSTMENT = 0.08;
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const distance = (a: WalkTarget, b: WalkTarget): number => Math.hypot(b.x - a.x, b.y - a.y);

/** Reconstruct a countdown, including an event which began between snapshots.
 * Interpolating countdown values would invent an early hit and replay wind-up.
 */
function timer(a: number, b: number, span: number, offset: number, duration: number): number {
  if (b > Math.max(0, a - span) + 1e-6) {
    const start = span - (duration - b);
    if (offset >= start) return Math.max(0, duration - (offset - start));
  }
  return Math.max(0, a - offset);
}

function heroBetween(a: HeroState, b: HeroState, span: number, offset: number): HeroState {
  const t = offset / span;
  const direct = distance(a, b);
  // Respawn/correction is a discontinuity, never a flight through walls.
  const budget = (a.stepTarget !== undefined ? CLASSIC_WALK_SPEED : 260) * span + 2;
  // A long packet gap can hide multiple turns; one endpoint cannot reconstruct
  // them safely. Hold and snap at the next state instead of inventing a shortcut.
  const missingCorners = a.stepTarget !== undefined && span > TILE_SIZE / CLASSIC_WALK_SPEED;
  if (missingCorners || direct > budget || b.walkTime < a.walkTime - 1e-6)
    return { ...a, vx: 0, vy: 0, attackTime: Math.max(0, a.attackTime - offset),
      hurtTime: Math.max(0, (a.hurtTime ?? 0) - offset) };
  let from: WalkTarget = a, to: WalkTarget = b, fraction = t;
  let pathLength = direct;
  const corner = a.stepTarget;
  if (corner && Number.isFinite(corner.x) && Number.isFinite(corner.y)) {
    const first = distance(a, corner), second = distance(corner, b);
    const total = first + second;
    // On the same leg, total > direct because the endpoint is still ahead.
    // A genuine corner has a new endpoint and a physically possible route.
    const changedStep = b.stepTarget?.x !== corner.x || b.stepTarget?.y !== corner.y;
    if (changedStep && first > 1e-6 && second > 1e-6 && total <= budget) {
      pathLength = total;
      const traveled = t * total;
      if (traveled < first) { to = corner; fraction = traveled / first; }
      else { from = corner; fraction = (traveled - first) / second; }
    }
  }
  const x = lerp(from.x, to.x, fraction), y = lerp(from.y, to.y, fraction);
  const length = distance(from, to);
  const nx = length > 1e-6 ? (to.x - from.x) / length : 0;
  const ny = length > 1e-6 ? (to.y - from.y) / length : 0;
  const attackTime = timer(a.attackTime, b.attackTime, span, offset, ATTACK_DURATION);
  const attackStarted = b.attackTime > Math.max(0, a.attackTime - span) + 1e-6 &&
    offset >= span - (ATTACK_DURATION - b.attackTime);
  const swing = attackStarted ? b : a;
  const face = attackTime > 0 ? swing : length > 1e-6
    ? { faceX: nx, faceY: ny } : a;
  return {
    ...a, x, y, faceX: face.faceX, faceY: face.faceY,
    vx: nx * pathLength / span, vy: ny * pathLength / span,
    walkTime: lerp(a.walkTime, b.walkTime, t), attackTime,
    attackWeapon: attackTime > 0 && swing.attackWeapon === "forge" ? "forge" : "starter",
    hurtTime: timer(a.hurtTime ?? 0, b.hurtTime ?? 0, span, offset, 0.3),
  };
}

/** A small presentation-only buffer for timestamped authoritative snapshots.
 * Coordinates never return to the simulation. Legacy servers need not opt in.
 */
export class SnapshotTimeline {
  private frames: Frame[] = [];
  private clock = 0;
  private rate = 1;
  get active(): boolean { return this.frames.length > 0; }
  reset(): void { this.frames = []; this.clock = 0; this.rate = 1; }

  push(time: number, players: HeroState[], mobs: MobState[]): boolean {
    const latest = this.frames.at(-1);
    if (!Number.isFinite(time) || time < 0 || (latest && time <= latest.time)) return false;
    if (!latest || time - this.clock > 0.4 || this.clock - time > 0.4) {
      // Recover after tab suspension, packet starvation or a slow server clock.
      // Start from the new state; never replay the old backlog on recovery.
      this.reset();
      this.clock = time - TARGET_BUFFER;
    } else if (this.clock >= this.frames[0]!.time) {
      // Room time advances in bounded ticks. Even small differences from the
      // browser clock would eventually drain the buffer and freeze the gait.
      const error = time - this.clock - TARGET_BUFFER;
      const adjustment = Math.max(-MAX_RATE_ADJUSTMENT, Math.min(MAX_RATE_ADJUSTMENT, error));
      this.rate = lerp(this.rate, 1 + adjustment, 0.2);
    }
    this.frames.push({ time, players: players.map(hero => ({ ...hero })), mobs: mobs.map(mob => ({ ...mob })) });
    if (this.frames.length > 32) this.frames.shift();
    return true;
  }

  advance(dt: number): { players: HeroState[]; mobs: MobState[] } | null {
    if (!this.active) return null;
    if (Number.isFinite(dt) && dt > 0) this.clock += Math.min(dt, 0.1) * this.rate;
    while (this.frames.length > 1 && this.frames[1]!.time <= this.clock) this.frames.shift();
    const a = this.frames[0]!, b = this.frames[1];
    const offset = Math.max(0, this.clock - a.time);
    if (!b || offset === 0) return {
      players: a.players.map(hero => ({ ...hero,
        attackTime: Math.max(0, hero.attackTime - offset),
        hurtTime: Math.max(0, (hero.hurtTime ?? 0) - offset),
        ...(offset > 0 ? { vx: 0, vy: 0 } : {}),
      })),
      mobs: a.mobs.map(mob => ({ ...mob, hurtTime: Math.max(0, (mob.hurtTime ?? 0) - offset) })),
    };
    const span = b.time - a.time;
    const heroes = new Map(b.players.map(hero => [hero.id, hero]));
    const mobs = new Map(b.mobs.map(mob => [mob.id, mob]));
    return {
      players: a.players.map(hero => {
        const next = heroes.get(hero.id);
        return next ? heroBetween(hero, next, span, offset) : { ...hero };
      }),
      mobs: a.mobs.map(mob => {
        const next = mobs.get(mob.id);
        if (!next || distance(mob, next) > 260 * span + 2) return { ...mob };
        const t = offset / span;
        return { ...mob, x: lerp(mob.x, next.x, t), y: lerp(mob.y, next.y, t),
          bounce: lerp(mob.bounce, next.bounce, t),
          hurtTime: timer(mob.hurtTime ?? 0, next.hurtTime ?? 0, span, offset, 0.3),
        };
      }),
    };
  }
}
