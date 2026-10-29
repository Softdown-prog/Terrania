import { moveBody, type CollisionMap } from "../world/collision.ts";
import {
  ATTACK_COOLDOWN,
  ATTACK_DURATION,
  ATTACK_WINDUP,
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
  hurtTime = 0;
  private invulnerable = 0;
  private knockX = 0;
  private knockY = 0;
  private strikePending = false;
  update(dt: number, dir: { x: number; y: number }, world: CollisionMap): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.1);
    const length = Math.hypot(dir.x, dir.y);
    const moving = Number.isFinite(length) && length > 0.001;
    const nx = moving ? dir.x / Math.max(1, length) : 0;
    const ny = moving ? dir.y / Math.max(1, length) : 0;
    if (moving && this.attackTime <= 0) {
      this.faceX = dir.x / length;
      this.faceY = dir.y / length;
    }
    const speed =
      126 *
      (world.speedAt?.(this.x, this.y) ?? 1) *
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
    this.attackTime = Math.max(0, this.attackTime - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.hurtTime = Math.max(0, this.hurtTime - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
  }
  startAttack(): boolean {
    if (this.attackCooldown > 0 || this.hp <= 0) return false;
    this.attackTime = ATTACK_DURATION;
    this.attackCooldown = ATTACK_COOLDOWN;
    this.strikePending = true;
    return true;
  }
  consumeStrike(): boolean {
    if (
      !this.strikePending ||
      this.attackTime > ATTACK_DURATION - ATTACK_WINDUP
    )
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
