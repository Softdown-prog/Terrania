import { CREATURE_CATALOG, type CreatureView } from "../../actors/CreatureCatalog.ts";
import type { Player } from "../../actors/Player.ts";
import type { CollisionMap } from "../../world/collision.ts";
import { canStrike, faceTarget } from "./combat.ts";
import { WEAPONS, type WeaponId } from "../character/Weapons.ts";
import { swordArc } from "./SwordCombat.ts";
import type { CombatProfile } from "./CombatProfile.ts";

/** Terrania's original classic-RPG prototype: target-and-wait, not an action combo.
 * Shared by the solo simulation and the authoritative Node room.
 */
export const CLASSIC_ATTACK_INTERVAL = WEAPONS.starter.interval;
export const CLASSIC_SELECT_RADIUS = 24;
export const CLASSIC_NEAREST_RADIUS = 145;

type Point = Readonly<{ x: number; y: number }>;
const isPoint = (p: Point): boolean =>
  Number.isFinite(p.x) && Number.isFinite(p.y);

/** A selected target never authorizes an out-of-range or wall-penetrating strike. */
export class ClassicCombat {
  private selected: string | null = null;
  private swingTarget: string | null = null;
  private remaining = 0;
  private blocked: "no-mana" | null = null;
  private blockedNotified = false;

  get targetId(): string | null { return this.selected; }
  get strikeTargetId(): string | null { return this.swingTarget; }
  get cooldown(): number { return this.remaining; }

  private setTarget(id: string | null): void {
    if (this.selected !== id) { this.swingTarget = null; this.unblock(); }
    this.selected = id;
  }

  /** Cancel focus and its pending strike while preserving the attack clock. */
  cancel(): void {
    this.setTarget(null);
  }

  /** A fresh world/player has no attack state from the previous simulation. */
  reset(): void {
    this.cancel();
    this.remaining = 0;
    this.blocked = null;
    this.blockedNotified = false;
  }

  /**
   * Por que o ataque não saiu (ADR 0069): hoje só "sem mana". Devolve o motivo UMA vez por bloqueio, para a tela avisar sem repetir a cada
   * quadro; volta a avisar depois que o ataque sai ou o alvo muda.
   */
  takeBlocked(): "no-mana" | null {
    if (this.blocked === null || this.blockedNotified) return null;
    this.blockedNotified = true;
    return this.blocked;
  }

  select(id: string, mobs: ReadonlyMap<string, CreatureView>): boolean {
    const target = mobs.get(id);
    if (!target || target.hp <= 0) return false;
    // Switching targets is allowed, but cannot bypass an existing attack timer.
    this.setTarget(id);
    return true;
  }

  selectAt(at: Point, mobs: Iterable<CreatureView>, radius = CLASSIC_SELECT_RADIUS): boolean {
    const nearest = nearestCombatCreature(at, mobs, radius);
    if (!nearest) return false;
    this.setTarget(nearest.id);
    return true;
  }

  selectNearest(hero: Point, mobs: Iterable<CreatureView>): boolean {
    return this.selectAt(hero, mobs, CLASSIC_NEAREST_RADIUS);
  }

  /** Call once per simulation tick before requesting startAttack. The simulation
   * still validates the impact after wind-up and grants loot/kills.
   */
  tick(dt: number, player: Player, mobs: ReadonlyMap<string, CreatureView>,
      collision: CollisionMap, interval: number = CLASSIC_ATTACK_INTERVAL,
      weapon: WeaponId = "starter", ranged?: CombatProfile["ranged"]): boolean {
    if (!Number.isFinite(dt) || dt <= 0) return false;
    this.remaining = Math.max(0, this.remaining - Math.min(dt, 0.1));
    if (!this.selected) return false;
    const mob = mobs.get(this.selected);
    if (!mob || mob.hp <= 0) { this.cancel(); return false; }
    if (player.hp <= 0 || !isPoint(mob) || !isPoint(player)) return false;
    // Atordoado, o herói não inicia golpe: não gastar a recarga nem o alvo do golpe.
    if (this.remaining > 0 || player.attackCooldown > 0 || player.stunned) return false;
    const facing = { x: player.x, y: player.y, faceX: player.faceX, faceY: player.faceY };
    faceTarget(facing, mob);
    const arc = ranged ? { reach: ranged.reach, cone: -0.1 } : swordArc(weapon);
    if (!canStrike(facing, mob, collision, arc.reach, arc.cone)) { this.unblock(); return false; }
    // Ao alcance mas sem mana: a magia não sai e a recarga não é gasta (ADR 0069).
    if (ranged && !ranged.ready) {
      if (this.blocked !== "no-mana") { this.blocked = "no-mana"; this.blockedNotified = false; }
      return false;
    }
    this.unblock();
    player.faceX = facing.faceX;
    player.faceY = facing.faceY;
    this.swingTarget = mob.id;
    this.remaining = interval;
    return true;
  }

  private unblock(): void { this.blocked = null; this.blockedNotified = false; }

  label(mobs: ReadonlyMap<string, CreatureView>): string | null {
    if (!this.selected) return null;
    const mob = mobs.get(this.selected);
    if (!mob || mob.hp <= 0) { this.cancel(); return null; }
    return CREATURE_CATALOG[mob.kind].name;
  }
}

export function nearestCombatCreature(at: Point, mobs: Iterable<CreatureView>,
  radius = CLASSIC_SELECT_RADIUS): CreatureView | null {
  if (!isPoint(at) || !Number.isFinite(radius) || radius <= 0) return null;
  let nearest: CreatureView | null = null;
  let best = radius;
  for (const mob of mobs) {
    if (mob.hp <= 0 || !isPoint(mob)) continue;
    const distance = Math.hypot(mob.x - at.x, mob.y - at.y);
    if (distance <= best) { nearest = mob; best = distance; }
  }
  return nearest;
}
