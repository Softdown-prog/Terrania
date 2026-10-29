import { Player } from '../../src/actors/Player.ts';
import { Slime, slimeSpawns } from '../../src/actors/Slime.ts';
import type { HeroState, MobState } from '../../src/shared/protocol.ts';
import { SeedCollision } from '../../src/world/collision.ts';
import { seedFromText } from '../../src/world/random.ts';
import { CHUNK_PIXELS, chunkOf } from '../../src/world/terrain.ts';

export interface Guest {
  id: string;
  name: string;
  actor: Player;
  input: { x: number; y: number };
  attackQueued: boolean;
  lastInputAt: number;
  kills: number;
}

/** Uma única instância de simulação por sala. Sem estado permanente nesta primeira versão. */
export class Room {
  readonly seed: number;
  readonly world: SeedCollision;
  readonly guests = new Map<string, Guest>();
  private readonly mobs = new Map<string, Slime>();
  private readonly defeated = new Set<string>();
  private spawnClock = 0;
  private readonly maxMobs = 96;
  readonly id: string;
  constructor(id: string) {
    this.id = id;
    this.seed = id === 'origins' ? 842136 : seedFromText(id);
    this.world = new SeedCollision(this.seed);
  }
  add(id: string, name: string): Guest {
    const guest: Guest = { id, name, actor: new Player(), input: { x: 0, y: 0 },
      attackQueued: false, lastInputAt: Date.now(), kills: 0 };
    this.guests.set(id, guest);
    return guest;
  }
  remove(id: string): void { this.guests.delete(id); }
  receiveInput(id: string, x: number, y: number, attack: boolean): void {
    const guest = this.guests.get(id);
    if (!guest) return;
    guest.input = { x, y };
    guest.lastInputAt = Date.now();
    if (attack) guest.attackQueued = true;
  }
  tick(dt: number, now = Date.now()): void {
    for (const guest of this.guests.values()) {
      const input = now - guest.lastInputAt < 350 ? guest.input : { x: 0, y: 0 };
      guest.actor.update(dt, input, this.world);
    }
    this.spawnClock += dt;
    if (this.spawnClock > 1.5) { this.spawnClock = 0; this.spawnNearGuests(); }
    for (const guest of this.guests.values()) {
      if (!guest.attackQueued) continue;
      guest.attackQueued = false;
      if (!guest.actor.startAttack()) continue;
      for (const [id, mob] of this.mobs) {
        const dx = mob.x - guest.actor.x, dy = mob.y - guest.actor.y;
        const dist = Math.hypot(dx, dy);
        const facing = (dx * guest.actor.faceX + dy * guest.actor.faceY) / Math.max(dist, 1);
        if (dist < 49 && facing > -.25) {
          mob.hp -= 1;
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
      let nearest: Guest | null = null; let closest = 260;
      for (const guest of this.guests.values()) {
        const distance = Math.hypot(guest.actor.x - mob.x, guest.actor.y - mob.y);
        if (distance < closest) { closest = distance; nearest = guest; }
      }
      if (nearest) mob.update(dt, nearest.actor, this.world);
      if (![...this.guests.values()].some(g =>
        Math.hypot(g.actor.x - mob.x, g.actor.y - mob.y) < CHUNK_PIXELS * 2.5)) this.mobs.delete(id);
    }
    for (const guest of this.guests.values()) {
      if (guest.actor.hp <= 0) {
        guest.actor = new Player(); guest.input = { x: 0, y: 0 }; guest.lastInputAt = 0;
      }
    }
  }
  private spawnNearGuests(): void {
    for (const guest of this.guests.values()) {
      if (this.mobs.size >= this.maxMobs) return;
      const cx = chunkOf(guest.actor.x), cy = chunkOf(guest.actor.y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        for (const mob of slimeSpawns(cx + dx, cy + dy, this.seed)) {
          if (this.mobs.size >= this.maxMobs) return;
          if (!this.defeated.has(mob.id) && !this.mobs.has(mob.id)) this.mobs.set(mob.id, mob);
        }
      }
    }
  }
  /** Interesse espacial: não transmitir o mapa todo nem entidades distantes. */
  snapshotFor(id: string): { players: HeroState[]; mobs: MobState[] } | null {
    const me = this.guests.get(id);
    if (!me) return null;
    const near = (x: number, y: number): boolean =>
      Math.abs(x - me.actor.x) < 920 && Math.abs(y - me.actor.y) < 920;
    const players: HeroState[] = [];
    for (const g of this.guests.values()) {
      if (!near(g.actor.x, g.actor.y)) continue;
      const a = g.actor;
      players.push({ id: g.id, name: g.name, x: a.x, y: a.y, hp: a.hp,
        kills: g.kills, faceX: a.faceX, faceY: a.faceY,
        walkTime: a.walkTime, attackTime: a.attackTime });
    }
    const mobs: MobState[] = [];
    for (const mob of this.mobs.values()) if (near(mob.x, mob.y)) {
      mobs.push({ id: mob.id, x: mob.x, y: mob.y, hp: mob.hp, bounce: mob.bounce });
    }
    return { players, mobs };
  }
}
