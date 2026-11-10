import { clearPath, moveBody, type CollisionMap } from "../world/collision.ts";
import { hash2 } from "../world/random.ts";
import { CHUNK_TILES, TILE_SIZE } from "../world/terrain.ts";
import { villageGround } from "../world/village.ts";
import { getRegionDifficulty } from "../world/regionDifficulty.ts";
import type { Player } from "./Player.ts";
import { CREATURE_CATALOG, type CreatureKind, type CreatureView } from "./CreatureCatalog.ts";

export class Slime implements CreatureView {
  readonly kind: CreatureKind;
  hp: number;
  x: number;
  y: number;
  private pulse = 0;
  contactCooldown = 0;
  hurtTime = 0;
  private knockX = 0;
  private knockY = 0;
  /** Independent elemental DOT and 20% movement slow from Knight swords. */
  private readonly swordEffects = new Map<"bleed" | "fire" | "poison" | "ice",{
    seconds:number; damage:number; elapsed:number
  }>();
  get swordSpeedMultiplier():number {
    return this.swordEffects.has("ice") ? .8 : 1;
  }
  applySwordStatus(kind:"bleed" | "fire" | "poison" | "ice",
    seconds:number, damage=0):void {
    if(this.hp<=0 || !Number.isFinite(seconds) || seconds<=0 || seconds>10 ||
      !Number.isFinite(damage) || damage<0 || damage>20)return;
    const existing=this.swordEffects.get(kind);
    this.swordEffects.set(kind,{seconds,damage,elapsed:existing?.elapsed??0});
  }
  /** Tick once per simulation step; deterministic, capped damage, never wall-clock based. */
  protected tickSwordStatuses(dt:number):void {
    if(!Number.isFinite(dt) || dt<=0)return;
    for(const [kind,fx] of this.swordEffects){
      const active=Math.min(dt,fx.seconds);
      fx.seconds=Math.max(0,fx.seconds-dt);
      fx.elapsed+=active;
      while(fx.elapsed>=1 && this.hp>0){
        fx.elapsed-=1;
        this.hp=Math.max(0,this.hp-fx.damage);
        if(fx.damage>0)this.hurtTime=Math.max(this.hurtTime,.16);
      }
      if(fx.seconds<=0)this.swordEffects.delete(kind);
    }
  }
  /** Armor is confined to notably armored species; ordinary fauna remains unarmored. */
  get defense():number {
    switch(this.kind){
      case "basalt-golem": return 20;
      case "coral-crab": return 12;
      case "tundra-mammoth": return 18;
      case "clay-troll": return 8;
      default: return 0;
    }
  }
  readonly id: string;
  constructor(id: string, x: number, y: number, kind: CreatureKind = "slime") {
    this.kind = kind;
    this.hp = CREATURE_CATALOG[kind].maxHp;
    this.id = id;
    this.x = x;
    this.y = y;
  }
  update(dt: number, player: Player, world: CollisionMap, defense = 0, protectVillage = true): void {
    this.tickSwordStatuses(dt);
    if(this.hp<=0)return;
    this.pulse += dt * 5;
    this.hurtTime = Math.max(0, this.hurtTime - dt);
    const monsterWorld: CollisionMap = protectVillage ? {
      canMove: (x, y) => villageGround(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE)) === null && world.canMove(x, y),
    } : world;
    moveBody(this, this.knockX * dt, this.knockY * dt, monsterWorld);
    this.knockX *= Math.exp(-10 * dt);
    this.knockY *= Math.exp(-10 * dt);
    this.contactCooldown = Math.max(0, this.contactCooldown - dt);
    // A cidade inicial é segura também na simulação autoritativa do servidor.
    if (protectVillage && villageGround(Math.floor(player.x / TILE_SIZE), Math.floor(player.y / TILE_SIZE))) return;
    const dx = player.x - this.x,
      dy = player.y - this.y,
      d = Math.hypot(dx, dy);
    if (d < 230 && d > 16) {
      const speed = 38 * this.swordSpeedMultiplier * (0.65 + 0.35 * Math.max(0, Math.sin(this.pulse)));
      if (this.hurtTime <= 0)
        moveBody(this, (dx / d) * speed * dt, (dy / d) * speed * dt, monsterWorld);
    }
    if (d < 24 && this.contactCooldown === 0 && clearPath(this, player, world)) {
      player.takeDamage(Math.max(1, CREATURE_CATALOG[this.kind].contactDamage - defense), this.x, this.y);
      this.contactCooldown = 1.2;
    }
  }
  takeHit(sourceX: number, sourceY: number, damage = 1): void {
    this.hp = Math.max(0, this.hp - damage);
    this.hurtTime = 0.22;
    const dx = this.x - sourceX,
      dy = this.y - sourceY,
      d = Math.hypot(dx, dy) || 1;
    this.knockX = (dx / d) * 170;
    this.knockY = (dy / d) * 170;
  }
  get bounce(): number {
    return Math.sin(this.pulse);
  }
}
export function slimeSpawns(cx: number, cy: number, seed: number): Slime[] {
  const tier = getRegionDifficulty((cx + 0.5) * CHUNK_TILES, (cy + 0.5) * CHUNK_TILES).tier;
  const count = (hash2(cx, cy, seed + 201) < 0.53 ? 1 : 2) + (tier >= 4 ? 1 : 0);
  const result: Slime[] = [];
  for (let index = 0; index < count; index++) {
    const tx =
      cx * CHUNK_TILES +
      Math.floor(hash2(cx * 4 + index, cy, seed + 77) * CHUNK_TILES);
    const ty =
      cy * CHUNK_TILES +
      Math.floor(hash2(cx, cy * 4 + index, seed + 97) * CHUNK_TILES);
    if (Math.hypot(tx, ty) < 9 || villageGround(tx, ty) || !worldTileWalkable(tx, ty, seed)) continue;
    result.push(
      new Slime(
        cx + "," + cy + "," + index,
        (tx + 0.5) * TILE_SIZE,
        (ty + 0.5) * TILE_SIZE,
      ),
    );
  }
  return result;
}
import { isWalkable as worldTileWalkable } from "../world/terrain.ts";
