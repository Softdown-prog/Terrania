import { moveBody, type CollisionMap } from "../world/collision.ts";
import {
  ATTACK_COOLDOWN,
  ATTACK_DURATION,
  ATTACK_WINDUP,
  HEAVY_ATTACK_COOLDOWN,
  HEAVY_ATTACK_DAMAGE,
  HEAVY_ATTACK_DURATION,
  HEAVY_ATTACK_WINDUP,
} from "../engine/combat.ts";
export class Player {
  x = 16;
  y = 16;
  hp = 100;
  maxHp = 100;
  vx = 0;
  vy = 0;
  faceX = 0;
  faceY = 1;
  walkTime = 0;
  attackTime = 0;
  attackCooldown = 0;
  attackKind: "light" | "heavy" = "light";
  get strikeDamage(): number { return this.attackKind === "heavy" ? HEAVY_ATTACK_DAMAGE : 1; }
  hurtTime = 0;
  private invulnerable = 0;
  private knockX = 0;
  private knockY = 0;
  private strikePending = false;
  /** Solo-only evasion state, never provided by the multiplayer protocol. */
  dodgeTime = 0;
  dodgeCooldown = 0;
  webSlowTime = 0;
  private dodgeX = 0;
  private dodgeY = 0;

  /** Collision-aware burst; invulnerability starts on the same simulation tick. */
  startDodge(dir: { x: number; y: number }): boolean {
    if (this.hp <= 0 || this.attackTime > 0 || this.dodgeTime > 0 ||
        this.dodgeCooldown > 0) return false;
    const requested = Math.hypot(dir.x, dir.y);
    const fallback = Math.hypot(this.faceX, this.faceY);
    const x = Number.isFinite(requested) && requested > 0.05 ? dir.x
      : fallback > 0 ? this.faceX : 0;
    const y = Number.isFinite(requested) && requested > 0.05 ? dir.y
      : fallback > 0 ? this.faceY : 1;
    const length = Math.hypot(x, y);
    if (!Number.isFinite(length) || length < 0.05) return false;
    this.dodgeX = x / length;
    this.dodgeY = y / length;
    this.faceX = this.dodgeX;
    this.faceY = this.dodgeY;
    this.dodgeTime = 0.22;
    this.dodgeCooldown = 1.1;
    this.invulnerable = Math.max(this.invulnerable, 0.26);
    this.vx = this.vy = 0;
    return true;
  }

  /** Applied only after a confirmed spider hit in the solo simulation. */
  applyWebSlow(seconds: number): void {
    if (Number.isFinite(seconds) && seconds > 0)
      this.webSlowTime = Math.max(this.webSlowTime, Math.min(seconds, 1.5));
  }
  update(dt: number, dir: { x: number; y: number }, world: CollisionMap): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.1);
    const length = Math.hypot(dir.x, dir.y);
    const moving = Number.isFinite(length) && length > 0.001;
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt);
    this.webSlowTime = Math.max(0, this.webSlowTime - dt);
    if (this.dodgeTime > 0) {
      const slice = Math.min(dt, this.dodgeTime);
      const beforeX = this.x, beforeY = this.y;
      moveBody(this, this.dodgeX * 285 * slice, this.dodgeY * 285 * slice, world);
      this.walkTime += Math.hypot(this.x - beforeX, this.y - beforeY) * 0.12;
      this.dodgeTime = Math.max(0, this.dodgeTime - dt);
      this.hurtTime = Math.max(0, this.hurtTime - dt);
      this.invulnerable = Math.max(0, this.invulnerable - dt);
      this.vx = this.vy = 0;
      return;
    }
    const nx = moving ? dir.x / Math.max(1, length) : 0;
    const ny = moving ? dir.y / Math.max(1, length) : 0;
    if (moving && this.attackTime <= 0) {
      this.faceX = dir.x / length;
      this.faceY = dir.y / length;
    }
    const speed =
      126 *
      (world.speedAt?.(this.x, this.y) ?? 1) *
      (this.attackTime > 0 ? (this.attackKind === "heavy" ? 0.45 : 0.72) : 1) *
      (this.webSlowTime > 0 ? 0.58 : 1);
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
    this.attackTime = Math.max(0, this.attackTime - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.hurtTime = Math.max(0, this.hurtTime - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
  }
  startAttack(): boolean {
    if (this.attackCooldown > 0 || this.hp <= 0 || this.dodgeTime > 0) return false;
    this.attackKind = "light";
    this.attackTime = ATTACK_DURATION;
    this.attackCooldown = ATTACK_COOLDOWN;
    this.strikePending = true;
    return true;
  }
  /** Ataque forte solo: preparação maior, dano duplo e recarga longa. */
  startHeavyAttack(): boolean {
    if (this.attackCooldown > 0 || this.hp <= 0 || this.dodgeTime > 0) return false;
    this.attackKind = "heavy";
    this.attackTime = HEAVY_ATTACK_DURATION;
    this.attackCooldown = HEAVY_ATTACK_COOLDOWN;
    this.strikePending = true;
    return true;
  }
  consumeStrike(): boolean {
    const duration = this.attackKind === "heavy" ? HEAVY_ATTACK_DURATION : ATTACK_DURATION;
    const windup = this.attackKind === "heavy" ? HEAVY_ATTACK_WINDUP : ATTACK_WINDUP;
    if (!this.strikePending || this.attackTime > duration - windup)
      return false;
    this.strikePending = false;
    return this.hp > 0;
  }
  takeDamage(amount: number, sourceX: number, sourceY: number): boolean {
    if (this.invulnerable > 0 || this.hp <= 0) return false;
    this.hp = Math.max(0, this.hp - amount);
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
