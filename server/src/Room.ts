import { Player } from "../../src/actors/Player.ts";
import { Slime, slimeSpawns } from "../../src/actors/Slime.ts";
import { CREATURE_CATALOG } from "../../src/actors/CreatureCatalog.ts";
import type {
  InventoryMessage, InventoryOutcome, InventoryReceipt, RoomState, WalkTarget,
} from "../../src/shared/protocol.ts";
import { clearPath, SeedCollision } from "../../src/world/collision.ts";
import { nearestNpc } from "../../src/world/npcs.ts";
import { seedFromText } from "../../src/world/random.ts";
import { CHUNK_PIXELS, TILE_SIZE, chunkOf } from "../../src/world/terrain.ts";
import { canStrike, faceTarget } from "../../src/engine/combat.ts";
import { ClassicTileWalker } from "../../src/engine/ClassicTileWalker.ts";
import { TapNavigator } from "../../src/engine/TapNavigator.ts";
import { ClassicCombat } from "../../src/engine/ClassicCombat.ts";
import { CLASSIC_FOLLOW_LIMIT, ClassicPursuit } from "../../src/engine/ClassicPursuit.ts";
import { grantExperience, maxHpForExperience } from "../../src/engine/Experience.ts";
import { Inventory } from "../../src/engine/Inventory.ts";
import { FOOD_IDS, hasNutrition } from "../../src/engine/Food.ts";
import { WEAPONS } from "../../src/engine/Weapons.ts";
import { MAX_WORLD_DROPS, PICKUP_DISTANCE, type LootDrop } from "../../src/engine/loot.ts";

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
interface GuestInventory {
  readonly bag: Inventory;
  readonly drops: Map<string, LootDrop>;
  receipt: InventoryReceipt | null;
  readonly equipment: boolean;
  readonly gearSlots: boolean;
}

export interface Guest {
  id: string;
  name: string;
  actor: Player;
  input: { x: number; y: number };
  inputPulse: { x: number; y: number } | null;
  attackQueued: boolean;
  lastInputAt: number;
  kills: number;
  experience: number | null;
  readonly walking: TileMovement | null;
  readonly targeting: TargetCombat | null;
  readonly inventory: GuestInventory | null;
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
  private simulationTime = 0;
  private nextDropId = 0;
  private readonly maxMobs = 96;
  readonly id: string;
  constructor(id: string) {
    this.id = id;
    this.seed = id === "origins" ? 842136 : seedFromText(id);
    this.world = new SeedCollision(this.seed);
  }
  add(id: string, name: string, tiles = false, targetCombat = false, progression = false, loot = false,
      equipment = false, gearSlots = false): Guest {
    const guest: Guest = {
      id,
      name,
      actor: new Player(),
      input: { x: 0, y: 0 },
      attackQueued: false,
      inputPulse: null,
      lastInputAt: Date.now(),
      kills: 0,
      experience: progression ? 0 : null,
      walking: tiles ? { walker: new ClassicTileWalker(), navigator: new TapNavigator(), nextPlanAt: 0 } : null,
      targeting: tiles && targetCombat
        ? { combat: new ClassicCombat(), pursuit: new ClassicPursuit(), follow: false, nextSelectionAt: 0 }
        : null,
      inventory: loot ? { bag: new Inventory(), drops: new Map(), receipt: null,
        equipment: tiles && targetCombat && equipment,
        gearSlots: tiles && targetCombat && equipment && gearSlots } : null,
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
    if (guest.walking && Math.hypot(x, y) >= 0.08) {
      if (!guest.walking.walker.destination) guest.inputPulse = { x, y };
      this.cancelWalk(guest);
    }
    if (!attack) return;
    const { targeting } = guest;
    if (!targeting) {
      guest.attackQueued = true;
      if (guest.walking) this.cancelWalk(guest);
      return;
    }
    const current = targeting.combat.targetId;
    if (current && this.mobs.has(current)) {
      targeting.follow = true;
    } else if (guest.lastInputAt >= targeting.nextSelectionAt) {
      targeting.nextSelectionAt = guest.lastInputAt + TARGET_CHANGE_MS;
      targeting.follow = targeting.combat.selectNearest(guest.actor, this.mobs.values());
    } else {
      return;
    }
    if (targeting.follow) this.cancelWalk(guest);
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
    if (target === null) {
      this.cancelWalk(guest);
      return;
    }
    // Replace the queued target in place so one guest cannot monopolize the queue.
    this.walkRequests.set(id, target);
  }
  receiveInventory(id: string, message: InventoryMessage): void {
    const { action, requestId } = message;
    const guest = this.guests.get(id);
    const inventory = guest?.inventory;
    if (!guest || !inventory || requestId <= (inventory.receipt?.requestId ?? 0)) return;
    inventory.receipt = { requestId, action, outcome: this.applyInventoryAction(guest.actor, inventory, message) };
  }
  private applyInventoryAction(actor: Player, { bag, equipment, gearSlots }: GuestInventory, message: InventoryMessage): InventoryOutcome {
    const { action } = message;
    if (actor.hp <= 0) return "unavailable";
    if (action === "trade-potion") {
      if (nearestNpc(actor.x, actor.y)?.id !== "lina") return "too-far";
      return bag.tradeGelForPotion();
    }
    if (action === "use-potion") {
      if (actor.hp >= actor.maxHp) return "full-health";
      return bag.usePotion(actor) ? "healed" : "no-potion";
    }
    const edible = FOOD_IDS.find(id => action === `eat-${id}`);
    if (edible) return bag.useFood(edible, actor);
    const purchase = FOOD_IDS.find(id => action === `buy-${id}`);
    if (purchase) {
      if (nearestNpc(actor.x, actor.y)?.id !== "lina") return "too-far";
      return bag.tradeGelForFood(purchase);
    }
    if (!equipment) return "unavailable";
    if (action === "set-gear") return gearSlots ? bag.equipGear(message.slot, message.item) : "unavailable";
    if (action === "buy-sword") return bag.buyForgeSword(actor);
    return bag.equipWeapon(action === "equip-forge" ? "forge" : "starter");
  }
  private collectLoot(guest: Guest): void {
    const { actor, inventory } = guest;
    if (!inventory) return;
    for (const [id, drop] of inventory.drops) {
      if (!inventory.bag.hasRoomForGel) break;
      if (Math.hypot(actor.x - drop.x, actor.y - drop.y) <= PICKUP_DISTANCE &&
          clearPath(actor, drop, this.world) && inventory.bag.addGel()) inventory.drops.delete(id);
    }
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
      if (actor.hp > 0) {
        const center = {
          x: (Math.floor(target.x / TILE_SIZE) + 0.5) * TILE_SIZE,
          y: (Math.floor(target.y / TILE_SIZE) + 0.5) * TILE_SIZE,
        };
        const accepted = walking.navigator.go(
          walking.walker.destination ?? actor, center, this.world, true, MAX_TAP_DISTANCE);
        if (accepted) {
          guest.input = STILL;
          guest.inputPulse = null;
          if (guest.targeting) {
            guest.targeting.follow = false;
            guest.targeting.pursuit.reset();
          }
        }
      }
      break;
    }
  }
  tick(dt: number, now = Date.now()): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.1);
    this.simulationTime += dt;
    this.planNextWalk(now);
    for (const guest of this.guests.values()) {
      const input = now - guest.lastInputAt < 350
        ? Math.hypot(guest.input.x, guest.input.y) >= 0.08 ? guest.input : guest.inputPulse ?? guest.input
        : STILL;
      guest.inputPulse = null;
      // Tile movement consumes each network input at most once. A delayed
      // release packet must not turn a short key press into a second step.
      // Legacy continuous clients intentionally retain their held input.
      if (guest.walking) guest.input = STILL;
      const { walking, actor, targeting } = guest;
      if (walking) {
        const manual = Math.hypot(input.x, input.y) >= 0.08;
        const route = walking.navigator.target !== null;
        if (manual) targeting?.pursuit.suspend();
        else if (!route && targeting?.follow)
          targeting.pursuit.direction(dt, actor, targeting.combat.targetId,
            this.mobs, this.world, true, walking.walker.destination);
        let routeTime = dt;
        walking.walker.advance(dt, () => {
          if (manual) return input;
          if (route) {
            const dir = walking.navigator.direction(actor, routeTime);
            routeTime = 0;
            return dir;
          }
          return targeting?.follow ? targeting.pursuit.direction(0, actor,
            targeting.combat.targetId, this.mobs, this.world, true) : STILL;
        }, actor, this.world);
      } else actor.update(dt, input, this.world);
    }
    this.spawnClock += dt;
    if (this.spawnClock > 1.5) {
      this.spawnClock = 0;
      this.spawnNearGuests();
    }
    for (const guest of this.guests.values()) {
      const combat = guest.targeting?.combat;
      const weapon = guest.inventory?.bag.loadout.equipped ?? "starter";
      if (combat?.tick(dt, guest.actor, this.mobs, this.world, WEAPONS[weapon].interval) || guest.attackQueued) {
        guest.actor.startAttack(weapon);
        guest.attackQueued = false;
      }
      const focused = combat?.strikeTargetId ? this.mobs.get(combat.strikeTargetId) : null;
      if (focused && guest.actor.attackTime > 0) faceTarget(guest.actor, focused);
      if (!guest.actor.consumeStrike()) continue;
      for (const [id, mob] of this.mobs) {
        if (combat && combat.strikeTargetId !== id) continue;
        if (canStrike(guest.actor, mob, this.world)) {
          mob.takeHit(guest.actor.x, guest.actor.y, guest.actor.strikeDamage);
          if (mob.hp <= 0) {
            this.mobs.delete(id);
            this.defeated.add(id);
            if (this.defeated.size > 5000) {
              const oldest = this.defeated.values().next().value;
              if (oldest) this.defeated.delete(oldest);
            }
            guest.kills++;
            if (guest.experience !== null)
              guest.experience = grantExperience(guest.experience, CREATURE_CATALOG[mob.kind].experience, guest.actor);
            const drops = guest.inventory?.drops;
            if (drops && drops.size < MAX_WORLD_DROPS) {
              const dropId = String(++this.nextDropId);
              drops.set(dropId, { id: dropId, item: "gel", x: mob.x, y: mob.y });
            }
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
      if (nearest) {
        const damageCount = nearest.actor.damageCount;
        mob.update(dt, nearest.actor, this.world, nearest.inventory?.bag.defense);
        if (nearest.walking && nearest.actor.damageCount !== damageCount)
          this.cancelWalk(nearest);
      }
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
      if (guest.actor.hp > 0) {
        this.collectLoot(guest);
      } else {
        this.cancelWalk(guest);
        guest.walking?.walker.reset();
        if (guest.targeting) {
          guest.targeting.combat.reset();
          guest.targeting.pursuit.reset();
          guest.targeting.follow = false;
        }
        guest.actor = new Player(maxHpForExperience(guest.experience ?? 0));
        guest.input = { x: 0, y: 0 };
        guest.inputPulse = null;
        guest.attackQueued = false;
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
  snapshotFor(id: string): RoomState | null {
    const me = this.guests.get(id);
    if (!me) return null;
    const near = (x: number, y: number): boolean =>
      Math.abs(x - me.actor.x) < 920 && Math.abs(y - me.actor.y) < 920;
    const players: RoomState["players"] = [];
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
        ...(g === me && g.experience !== null ? { experience: g.experience } : {}),
        faceX: a.faceX,
        faceY: a.faceY,
        walkTime: a.walkTime,
        attackTime: a.attackTime,
        ...(a.attackTime > 0 && a.attackWeapon === "forge" ? { attackWeapon: a.attackWeapon } : {}),
        ...(g.inventory?.equipment && g.inventory.bag.loadout.equipped === "forge"
          ? { equippedWeapon: "forge" as const } : {}),
        vx: a.vx,
        vy: a.vy,
        hurtTime: a.hurtTime,
        ...(g.inventory?.gearSlots && Object.keys(g.inventory.bag.gear).length > 0
          ? { gear: g.inventory.bag.gear } : {}),
        ...(me.walking && g.walking ? { stepTarget: g.walking.walker.destination } : {}),
      });
    }
    const mobs: RoomState["mobs"] = [];
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
    const inventory = me.inventory;
    return {
      players, mobs,
      ...(me.walking ? { time: this.simulationTime, walkTarget: me.walking.navigator.target } : {}),
      ...(me.targeting ? { focus } : {}),
      ...(inventory ? { inventory: {
        gel: inventory.bag.gel,
        potion: inventory.bag.potion,
        ...(Object.values(inventory.bag.food).some(v => v > 0) ? { food: inventory.bag.food } : {}),
        ...(hasNutrition(me.actor.nutrition) ? { nutrition: me.actor.nutrition } : {}),
        drops: [...inventory.drops.values()].filter(drop => near(drop.x, drop.y)),
        receipt: inventory.receipt,
        ...(inventory.equipment ? { loadout: inventory.bag.loadout } : {}),
        ...(inventory.gearSlots ? { gear: inventory.bag.gear } : {}),
      } } : {}),
    };
  }
}
