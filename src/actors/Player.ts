import { moveBody, type CollisionMap } from "../world/collision.ts";
import {
  ATTACK_COOLDOWN,
  ATTACK_DURATION,
} from "../engine/combat.ts";
import { BASE_MAX_HP } from "../engine/Experience.ts";
import { WEAPONS, type WeaponId } from "../engine/Weapons.ts";
import { FOODS, FOOD_EAT_COOLDOWN, FOOD_HEAL_INTERVAL, MAX_NUTRITION,
  normalizeNutrition, type FoodId, type FoodUseResult, type NutritionState } from "../engine/Food.ts";
export class Player {
  x = 16;
  y = 16;
  hp: number;
  maxHp: number;
  vx = 0;
  vy = 0;
  faceX = 0;
  faceY = 1;
  walkTime = 0;
  attackTime = 0;
  attackWeapon: WeaponId = "starter";
  attackCooldown = 0;
  hurtTime = 0;
  private receivedHits = 0;
  private invulnerable = 0;
  private knockX = 0;
  private knockY = 0;
  private strikePending = false;
  private nourishment: NutritionState = { reserve: 0, elapsed: 0, cooldown: 0 };
  constructor(maxHp = BASE_MAX_HP) {
    this.hp = maxHp;
    this.maxHp = maxHp;
  }
  get nutrition(): NutritionState { return { ...this.nourishment }; }
  restoreNutrition(state: unknown): void { this.nourishment = normalizeNutrition(state); }
  eatFood(food: FoodId): FoodUseResult {
    if (this.hp <= 0) return "unavailable";
    if (this.nourishment.cooldown > 0) return "eat-cooldown";
    if (this.nourishment.reserve + FOODS[food].healBudget > MAX_NUTRITION) return "nutrition-full";
    this.nourishment = { ...this.nourishment,
      reserve: this.nourishment.reserve + FOODS[food].healBudget, cooldown: FOOD_EAT_COOLDOWN };
    return "ate";
  }
  /** Recuperação temporal; não aplica cura instantânea, não ultrapassa HP máximo e não revive. */
  private advanceNutrition(dt: number): void {
    const s = this.nourishment;
    const remainingCooldown = s.cooldown - dt;
    // Evita bloquear comida por erro de ponto flutuante no fim exato dos 5 segundos.
    const cooldown = remainingCooldown < 1e-8 ? 0 : remainingCooldown;
    if (this.hp <= 0 || this.hp >= this.maxHp || s.reserve <= 0) {
      this.nourishment = { reserve: s.reserve, elapsed: 0, cooldown };
      return;
    }
    const elapsed = s.elapsed + dt;
    const healed = Math.min(s.reserve, Math.max(0, this.maxHp - this.hp),
      Math.floor((elapsed + 1e-9) / FOOD_HEAL_INTERVAL));
    this.hp += healed;
    this.nourishment = {
      reserve: s.reserve - healed,
      elapsed: this.hp >= this.maxHp || healed === s.reserve ? 0 : Math.max(0, elapsed - healed * FOOD_HEAL_INTERVAL),
      cooldown,
    };
  }
  /** Counts applied hits so movement can react to damage once per impact. */
  get damageCount(): number { return this.receivedHits; }
  update(dt: number, dir: { x: number; y: number }, world: CollisionMap,
    timersOnly = false): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.1);
    if (this.hp <= 0) {
      this.vx = this.vy = this.knockX = this.knockY = 0;
      this.strikePending = false;
      this.advanceTimers(dt);
      return;
    }
    if (timersOnly) {
      // A classic tile controller owns displacement; still tick attack,
      // damage immunity and animation timers exactly once per simulation tick.
      this.vx = 0; this.vy = 0;
      this.knockX = 0; this.knockY = 0;
      this.advanceTimers(dt);
      return;
    }
    const length = Math.hypot(dir.x, dir.y);
    const moving = Number.isFinite(length) && length > 0.001;
    const nx = moving ? dir.x / Math.max(1, length) : 0;
    const ny = moving ? dir.y / Math.max(1, length) : 0;
    if (moving && this.attackTime <= 0) {
      this.faceX = dir.x / length;
      this.faceY = dir.y / length;
    }
    const terrainSpeed = world.speedAt?.(this.x, this.y) ?? 1;
    const speed =
      126 *
      (Number.isFinite(terrainSpeed) ? Math.max(0, terrainSpeed) : 0) *
      (this.attackTime > 0 ? 0.72 : 1);
    const response = moving ? 18 : 25;
    const decay = Math.exp(-response * dt);
    // Exact integration of acceleration makes 20 Hz server and 60 Hz client agree.
    const dx =
      nx * speed * dt + ((this.vx - nx * speed) * (1 - decay)) / response;
    const dy =
      ny * speed * dt + ((this.vy - ny * speed) * (1 - decay)) / response;
    this.vx = nx * speed + (this.vx - nx * speed) * decay;
    this.vy = ny * speed + (this.vy - ny * speed) * decay;
    const oldX = this.x,
      oldY = this.y;
    moveBody(this, dx + this.knockX * dt, dy + this.knockY * dt, world);
    if (Math.abs(this.x - oldX) < 0.001) this.vx = 0;
    if (Math.abs(this.y - oldY) < 0.001) this.vy = 0;
    this.walkTime += Math.hypot(this.x - oldX, this.y - oldY) * 0.12;
    this.knockX *= Math.exp(-12 * dt);
    this.knockY *= Math.exp(-12 * dt);
    this.advanceTimers(dt);
  }
  private advanceTimers(dt: number): void {
    this.attackTime = Math.max(0, this.attackTime - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.hurtTime = Math.max(0, this.hurtTime - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.advanceNutrition(dt);
  }
  get strikeDamage(): number { return WEAPONS[this.attackWeapon].damage; }
  startAttack(weapon: WeaponId = "starter"): boolean {
    if (this.attackCooldown > 0 || this.hp <= 0) return false;
    this.attackTime = ATTACK_DURATION;
    this.attackCooldown = ATTACK_COOLDOWN;
    this.attackWeapon = weapon;
    this.strikePending = true;
    return true;
  }
  consumeStrike(): boolean {
    if (
      !this.strikePending ||
      this.attackTime > ATTACK_DURATION - WEAPONS[this.attackWeapon].windup + 1e-9
    )
      return false;
    this.strikePending = false;
    return this.hp > 0;
  }
  takeDamage(amount: number, sourceX: number, sourceY: number): boolean {
    if (this.invulnerable > 0 || this.hp <= 0 || !Number.isFinite(amount) || amount <= 0 ||
        !Number.isFinite(sourceX) || !Number.isFinite(sourceY)) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.receivedHits++;
    this.hurtTime = 0.3;
    this.invulnerable = 0.65;
    const dx = this.x - sourceX,
      dy = this.y - sourceY,
      d = Math.hypot(dx, dy) || 1;
    this.knockX = (dx / d) * 100;
    this.knockY = (dy / d) * 100;
    return true;
  }
}
