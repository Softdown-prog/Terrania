import { moveBody, type CollisionMap } from "../world/collision.ts";
import { TILE_SIZE } from "../world/terrain.ts";
import { villageGround } from "../world/village.ts";
import { MONSTER_SPECIES, type MonsterKind, type MonsterSpec } from "./MonsterSpecies.ts";
import type { Player } from "./Player.ts";

/** Entidade do motor sem dependência de DOM/Angular/Phaser ou rede. */
export class Monster {
  hp: number;
  x: number;
  y: number;
  contactCooldown = 0;
  hurtTime = 0;
  readonly species: MonsterSpec;
  readonly kind: MonsterKind;
  readonly id: string;
  private pulse = 0;
  private knockX = 0;
  private knockY = 0;

  constructor(kind: MonsterKind, id: string, x: number, y: number) {
    this.kind = kind;
    this.id = id;
    this.species = MONSTER_SPECIES[kind];
    this.hp = this.species.hp;
    this.x = x;
    this.y = y;
  }

  update(dt: number, player: Player, world: CollisionMap): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(0.1, dt);
    this.pulse += dt * 5;
    this.hurtTime = Math.max(0, this.hurtTime - dt);
    moveBody(this, this.knockX * dt, this.knockY * dt, world);
    this.knockX *= Math.exp(-10 * dt);
    this.knockY *= Math.exp(-10 * dt);
    this.contactCooldown = Math.max(0, this.contactCooldown - dt);

    // Mesmo perímetro seguro do Slime antigo.
    if (villageGround(Math.floor(player.x / TILE_SIZE), Math.floor(player.y / TILE_SIZE))) return;
    const dx = player.x - this.x, dy = player.y - this.y;
    const distance = Math.hypot(dx, dy);
    if (distance < this.species.aggroRadius && distance > 16 && this.hurtTime <= 0) {
      let multiplier: number;
      switch (this.species.ai) {
        case "hop":
          multiplier = 0.65 + 0.35 * Math.max(0, Math.sin(this.pulse));
          break;
        case "rush":
          multiplier = distance < 120 ? 1.25 : 0.9;
          break;
        case "stalk":
          multiplier = distance < 95 ? 1.15 : 0.68;
          break;
      }
      const speed = this.species.speed * multiplier;
      moveBody(this, dx / distance * speed * dt, dy / distance * speed * dt, world);
    }
    if (distance < this.species.contactRadius && this.contactCooldown === 0) {
      player.takeDamage(this.species.damage, this.x, this.y);
      this.contactCooldown = this.species.attackCooldown;
    }
  }

  takeHit(sourceX: number, sourceY: number, damage = 1): void {
    if (!Number.isSafeInteger(damage) || damage <= 0) return;
    this.hp = Math.max(0, this.hp - damage);
    this.hurtTime = 0.22;
    const dx = this.x - sourceX, dy = this.y - sourceY;
    const distance = Math.hypot(dx, dy) || 1;
    this.knockX = dx / distance * 170;
    this.knockY = dy / distance * 170;
  }

  get bounce(): number { return Math.sin(this.pulse); }
}
