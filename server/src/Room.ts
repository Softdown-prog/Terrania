import { Player } from "../../src/actors/Player.ts";
import { Slime, slimeSpawns } from "../../src/actors/Slime.ts";
import type { CombatFocus, HeroState, MobState, WalkTarget } from "../../src/shared/protocol.ts";
import { SeedCollision } from "../../src/world/collision.ts";
import { seedFromText } from "../../src/world/random.ts";
import { CHUNK_PIXELS, TILE_SIZE, chunkOf } from "../../src/world/terrain.ts";
import { canStrike } from "../../src/engine/combat.ts";
import { ClassicTileWalker } from "../../src/engine/ClassicTileWalker.ts";
import { TapNavigator } from "../../src/engine/TapNavigator.ts";
import { ClassicCombat } from "../../src/engine/ClassicCombat.ts";
import { CLASSIC_FOLLOW_LIMIT, ClassicPursuit } from "../../src/engine/ClassicPursuit.ts";

const STILL = { x: 0, y: 0 };
const MAX_TAP_DISTANCE = 480;
const TAP_REPLAN_MS = 350;
const TARGET_CHANGE_MS = 350;

interface TileMovement {
  readonly walker: ClassicTileWalker;
  readonly navigator: TapNavigator;
  nextPlanAt: number;
}
interface TargetCombat {
  readonly combat: ClassicCombat;
  readonly pursuit: ClassicPursuit;
  follow: boolean;
  nextSelectionAt: number;
}

export interface Guest {
  id: string;
  name: string;
  actor: Player;
  input: { x: number; y: number };
  attackQueued: boolean;
  lastInputAt: number;
  kills: number;
  readonly walking: TileMovement | null;
  readonly targeting: TargetCombat | null;
}

/** Uma única instância de simulação por sala. Sem estado permanente nesta primeira versão. */
export class Room {
  readonly seed: number;
  readonly world: SeedCollision;
  readonly guests = new Map<string, Guest>();
  private readonly mobs = new Map<string, Slime>();
  private readonly defeated = new Set<string>();
  private readonly walkRequests = new Map<string, WalkTarget>();
  private spawnClock = 0;
  private readonly maxMobs = 96;
  readonly id: string;
  constructor(id: string) {
    this.id = id;
    this.seed = id === "origins" ? 842136 : seedFromText(id);
    this.world = new SeedCollision(this.seed);
  }
  add(id: string, name: string, tiles = false, targetCombat = false): Guest {
    const guest: Guest = {
      id,
      name,
      actor: new Player(),
      input: { x: 0, y: 0 },
      attackQueued: false,
      lastInputAt: Date.now(),
      kills: 0,
      walking: tiles ? { walker: new ClassicTileWalker(), navigator: new TapNavigator(), nextPlanAt: 0 } : null,
      targeting: tiles && targetCombat
        ? { combat: new ClassicCombat(), pursuit: new ClassicPursuit(), follow: false, nextSelectionAt: 0 }
        : null,
    };
    this.guests.set(id, guest);
    return guest;
  }
  remove(id: string): void {
    this.guests.delete(id);
    this.walkRequests.delete(id);
  }
  receiveInput(id: string, x: number, y: number, attack: boolean): void {
    const guest = this.guests.get(id);
    if (!guest) return;
    guest.input = { x, y };
    guest.lastInputAt = Date.now();
    if (guest.walking && (attack || Math.hypot(x, y) >= 0.08)) this.cancelWalk(guest);
    if (!attack) return;
    const { targeting } = guest;
    if (!targeting) {
      guest.attackQueued = true;
    } else if (targeting.combat.targetId) {
      targeting.follow = true;
    } else if (guest.lastInputAt >= targeting.nextSelectionAt) {
      targeting.nextSelectionAt = guest.lastInputAt + TARGET_CHANGE_MS;
      targeting.follow = targeting.combat.selectNearest(guest.actor, this.mobs.values());
    }
  }
  receiveTarget(id: string, targetId: string | null): void {
    const guest = this.guests.get(id);
    const targeting = guest?.targeting;
    if (!guest || !targeting) return;
    if (targetId === null) {
      targeting.combat.cancel();
      targeting.pursuit.reset();
      targeting.follow = false;
      return;
    }
    const target = this.mobs.get(targetId);
    if (!target || guest.actor.hp <= 0 ||
        Math.hypot(target.x - guest.actor.x, target.y - guest.actor.y) > CLASSIC_FOLLOW_LIMIT) return;
    if (!targeting.combat.select(targetId, this.mobs)) return;
    targeting.follow = true;
    this.cancelWalk(guest);
  }
  receiveWalk(id: string, target: WalkTarget | null): void {
    const guest = this.guests.get(id);
    if (!guest?.walking) return;
    guest.walking.navigator.cancel();
    if (target === null) {
      this.walkRequests.delete(id);
      return;
    }
    guest.input = STILL;
    if (guest.targeting) {
      guest.targeting.follow = false;
      guest.targeting.pursuit.reset();
    }
    // Replace the queued target in place so one guest cannot monopolize the queue.
    this.walkRequests.set(id, target);
  }
  private cancelWalk(guest: Guest): void {
    guest.walking?.navigator.cancel();
    this.walkRequests.delete(guest.id);
  }
  private planNextWalk(now: number): void {
    // At most one bounded path search per room tick and one per guest per window.
    for (const [id, target] of this.walkRequests) {
      const guest = this.guests.get(id);
      if (!guest?.walking) { this.walkRequests.delete(id); continue; }
      const { walking, actor } = guest;
      if (now < walking.nextPlanAt) continue;
      this.walkRequests.delete(id);
      walking.nextPlanAt = now + TAP_REPLAN_MS;
      if (actor.hp > 0 && actor.hurtTime === 0) {
        const center = {
          x: (Math.floor(target.x / TILE_SIZE) + 0.5) * TILE_SIZE,
          y: (Math.floor(target.y / TILE_SIZE) + 0.5) * TILE_SIZE,
        };
        walking.navigator.go(walking.walker.destination ?? actor, center, this.world, true, MAX_TAP_DISTANCE);
      }
      break;
    }
  }
  tick(dt: number, now = Date.now()): void {
    this.planNextWalk(now);
    for (const guest of this.guests.values()) {
      const input =
        now - guest.lastInputAt < 350 ? guest.input : STILL;
      const { walking, actor, targeting } = guest;
      if (walking) {
        let direction = input;
        if (Math.hypot(input.x, input.y) >= 0.08) targeting?.pursuit.suspend();
        else if (walking.navigator.target)
          direction = walking.walker.destination ? STILL : walking.navigator.direction(actor, dt);
        else if (targeting?.follow)
          direction = targeting.pursuit.direction(dt, actor, targeting.combat.targetId,
            this.mobs, this.world, true, walking.walker.destination);
        walking.walker.advance(dt, direction, actor, this.world);
      } else actor.update(dt, input, this.world);
    }
    this.spawnClock += dt;
    if (this.spawnClock > 1.5) {
      this.spawnClock = 0;
      this.spawnNearGuests();
    }
    for (const guest of this.guests.values()) {
      const combat = guest.targeting?.combat;
      if (combat?.tick(dt, guest.actor, this.mobs, this.world) || guest.attackQueued) {
        guest.actor.startAttack();
        guest.attackQueued = false;
      }
      if (!guest.actor.consumeStrike()) continue;
      for (const [id, mob] of this.mobs) {
        if (combat) {
          if (combat.strikeTargetId !== id) continue;
          const dx = mob.x - guest.actor.x, dy = mob.y - guest.actor.y;
          const distance = Math.hypot(dx, dy);
          if (distance > 0.01) {
            guest.actor.faceX = dx / distance;
            guest.actor.faceY = dy / distance;
          }
        }
        if (canStrike(guest.actor, mob, this.world)) {
          mob.takeHit(guest.actor.x, guest.actor.y);
          if (mob.hp <= 0) {
            this.mobs.delete(id);
            this.defeated.add(id);
            if (this.defeated.size > 5000) {
              const oldest = this.defeated.values().next().value;
              if (oldest) this.defeated.delete(oldest);
            }
            guest.kills++;
          }
        }
      }
    }
    for (const [id, mob] of this.mobs) {
      let nearest: Guest | null = null;
      let closest = 260;
      for (const guest of this.guests.values()) {
        const distance = Math.hypot(
          guest.actor.x - mob.x,
          guest.actor.y - mob.y,
        );
        if (distance < closest) {
          closest = distance;
          nearest = guest;
        }
      }
      if (nearest) mob.update(dt, nearest.actor, this.world);
      if (
        ![...this.guests.values()].some(
          (g) =>
            Math.hypot(g.actor.x - mob.x, g.actor.y - mob.y) <
            CHUNK_PIXELS * 2.5,
        )
      )
        this.mobs.delete(id);
    }
    for (const guest of this.guests.values()) {
      if (guest.walking && guest.actor.hurtTime > 0) this.cancelWalk(guest);
      if (guest.actor.hp <= 0) {
        guest.walking?.walker.reset();
        if (guest.targeting) {
          guest.targeting.combat.reset();
          guest.targeting.pursuit.reset();
          guest.targeting.follow = false;
        }
        guest.actor = new Player();
        guest.input = { x: 0, y: 0 };
        guest.lastInputAt = 0;
      }
    }
  }
  private spawnNearGuests(): void {
    for (const guest of this.guests.values()) {
      if (this.mobs.size >= this.maxMobs) return;
      const cx = chunkOf(guest.actor.x),
        cy = chunkOf(guest.actor.y);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          for (const mob of slimeSpawns(cx + dx, cy + dy, this.seed)) {
            if (this.mobs.size >= this.maxMobs) return;
            if (!this.defeated.has(mob.id) && !this.mobs.has(mob.id))
              this.mobs.set(mob.id, mob);
          }
        }
    }
  }
  /** Interesse espacial: não transmitir o mapa todo nem entidades distantes. */
  snapshotFor(id: string): {
    players: HeroState[]; mobs: MobState[]; walkTarget?: WalkTarget | null; focus?: CombatFocus | null;
  } | null {
    const me = this.guests.get(id);
    if (!me) return null;
    const near = (x: number, y: number): boolean =>
      Math.abs(x - me.actor.x) < 920 && Math.abs(y - me.actor.y) < 920;
    const players: HeroState[] = [];
    for (const g of this.guests.values()) {
      if (!near(g.actor.x, g.actor.y)) continue;
      const a = g.actor;
      players.push({
        id: g.id,
        name: g.name,
        x: a.x,
        y: a.y,
        hp: a.hp,
        kills: g.kills,
        faceX: a.faceX,
        faceY: a.faceY,
        walkTime: a.walkTime,
        attackTime: a.attackTime,
        vx: a.vx,
        vy: a.vy,
        hurtTime: a.hurtTime,
      });
    }
    const mobs: MobState[] = [];
    for (const mob of this.mobs.values())
      if (near(mob.x, mob.y)) {
        mobs.push({
          id: mob.id,
          x: mob.x,
          y: mob.y,
          hp: mob.hp,
          bounce: mob.bounce,
          hurtTime: mob.hurtTime,
        });
      }
    const targetId = me.targeting?.combat.targetId;
    const focus = targetId && me.targeting && this.mobs.has(targetId)
      ? { id: targetId, following: me.targeting.pursuit.destination !== null }
      : null;
    return {
      players, mobs,
      ...(me.walking ? { walkTarget: me.walking.navigator.target } : {}),
      ...(me.targeting ? { focus } : {}),
    };
  }
}
