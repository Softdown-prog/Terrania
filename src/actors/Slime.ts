import { clearPath, moveBody, type CollisionMap } from "../world/collision.ts";
import { hash2 } from "../world/random.ts";
import { CHUNK_TILES, TILE_SIZE } from "../world/terrain.ts";
import { protectedSurfaceTile } from "../world/village.ts";
import { getRegionDifficulty } from "../world/regionDifficulty.ts";
import type { Player } from "./Player.ts";
import { CREATURE_CATALOG, type CreatureKind, type CreatureView } from "./CreatureCatalog.ts";

/** O dano ao longo do tempo de uma magia de cajado: `damage` por segundo e por acúmulo, `seconds` que faltam e a fração de segundo já contada. */
interface SpellDot { stacks: number; damage: number; seconds: number; elapsed: number }
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
  /** A lentidão das magias de cajado (ADR 0073): a velocidade que sobra e por quanto tempo; vale a mais forte entre a da espada e a da magia. */
  private spellSlow: { factor: number; seconds: number } | null = null;
  get swordSpeedMultiplier():number {
    return Math.min(this.swordEffects.has("ice") ? .8 : 1, this.spellSlow?.factor ?? 1);
  }
  applySpellSlow(factor: number, seconds: number): void {
    if (this.hp <= 0 || !Number.isFinite(factor) || factor <= 0 || factor >= 1 || !Number.isFinite(seconds) || seconds <= 0 || seconds > 10) return;
    this.spellSlow = { factor: Math.min(factor, this.spellSlow?.factor ?? 1), seconds: Math.max(seconds, this.spellSlow?.seconds ?? 0) };
  }
  /** Quanto falta da lentidão da magia, em segundos (0 se não há). */
  get spellSlowSeconds(): number { return this.spellSlow?.seconds ?? 0; }
  /** A queimadura das magias de cajado (ADR 0075): `damage` por segundo durante `seconds`; um novo acerto renova o tempo, sem somar o dano. */
  private spellBurn: SpellDot | null = null;
  applySpellBurn(damage: number, seconds: number): void {
    if (this.hp <= 0 || !Number.isFinite(damage) || damage <= 0 || damage > 20 || !Number.isFinite(seconds) || seconds <= 0 || seconds > 10) return;
    this.spellBurn = { stacks: 1, damage, seconds, elapsed: this.spellBurn?.elapsed ?? 0 };
  }
  /** Quanto falta da queimadura da magia, em segundos (0 se não há). */
  get spellBurnSeconds(): number { return this.spellBurn?.seconds ?? 0; }
  /** O veneno das magias de cajado (ADR 0075): acumula até `maxStacks`; cada acúmulo causa `damage` por segundo; um novo acerto renova o tempo. */
  private spellPoison: SpellDot | null = null;
  applySpellPoison(damage: number, seconds: number, maxStacks: number): void {
    if (this.hp <= 0 || !Number.isFinite(damage) || damage <= 0 || damage > 20 || !Number.isFinite(seconds) || seconds <= 0 || seconds > 10 ||
      !Number.isInteger(maxStacks) || maxStacks < 1 || maxStacks > 5) return;
    const old = this.spellPoison;
    this.spellPoison = { stacks: Math.min(maxStacks, (old?.stacks ?? 0) + 1), damage, seconds, elapsed: old?.elapsed ?? 0 };
  }
  /** Quantos acúmulos de veneno de magia o alvo tem agora (0 se não há). */
  get spellPoisonStacks(): number { return this.spellPoison?.stacks ?? 0; }
  applySwordStatus(kind:"bleed" | "fire" | "poison" | "ice",
    seconds:number, damage=0):void {
    if(this.hp<=0 || !Number.isFinite(seconds) || seconds<=0 || seconds>10 ||
      !Number.isFinite(damage) || damage<0 || damage>20)return;
    const existing=this.swordEffects.get(kind);
    this.swordEffects.set(kind,{seconds,damage,elapsed:existing?.elapsed??0});
  }
  /** Um passo do dano ao longo do tempo das magias: um tique por segundo (o último não se perde por erro de arredondamento); `false` quando acabou. */
  private tickSpellDot(dot:SpellDot,dt:number):boolean {
    dot.elapsed+=Math.min(dt,dot.seconds);
    dot.seconds=Math.max(0,dot.seconds-dt);
    while(dot.elapsed>=1-1e-9 && this.hp>0){
      dot.elapsed-=1;
      this.hp=Math.max(0,this.hp-dot.damage*dot.stacks);
      this.hurtTime=Math.max(this.hurtTime,.16);
    }
    return dot.seconds>0;
  }
  /** Tick once per simulation step; deterministic, capped damage, never wall-clock based. */
  protected tickSwordStatuses(dt:number):void {
    if(!Number.isFinite(dt) || dt<=0)return;
    if(this.spellSlow){
      this.spellSlow.seconds-=dt;
      if(this.spellSlow.seconds<=0)this.spellSlow=null;
    }
    if(this.spellBurn && !this.tickSpellDot(this.spellBurn,dt))this.spellBurn=null;
    if(this.spellPoison && !this.tickSpellDot(this.spellPoison,dt))this.spellPoison=null;
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
      canMove: (x, y) => !protectedSurfaceTile(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE)) && world.canMove(x, y),
    } : world;
    moveBody(this, this.knockX * dt, this.knockY * dt, monsterWorld);
    this.knockX *= Math.exp(-10 * dt);
    this.knockY *= Math.exp(-10 * dt);
    this.contactCooldown = Math.max(0, this.contactCooldown - dt);
    // A cidade inicial é segura também na simulação autoritativa do servidor.
    if (protectVillage && protectedSurfaceTile(Math.floor(player.x / TILE_SIZE), Math.floor(player.y / TILE_SIZE))) return;
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
    if (Math.hypot(tx, ty) < 9 || protectedSurfaceTile(tx, ty) || !worldTileWalkable(tx, ty, seed)) continue;
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
