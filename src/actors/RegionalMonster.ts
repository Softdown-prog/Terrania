import { Slime } from "./Slime.ts";
import { CREATURE_CATALOG, REGIONAL_CREATURE_KINDS,
  type RegionalCreatureKind, type CreatureDefinition } from "./CreatureCatalog.ts";
import { moveBody, clearPath, canMoveOnSeed, type CollisionMap } from "../world/collision.ts";
import { getWorldRegion } from "../world/regions.ts";
import { getBiomeAt } from "../world/biomes.ts";
import { caveThemeAt, type CaveTheme } from "../world/caves.ts";
import { CHUNK_TILES, TILE_SIZE } from "../world/terrain.ts";
import { hash2 } from "../world/random.ts";
import type { Player } from "./Player.ts";
import { villageGround } from "../world/village.ts";

/** Instância viva do bestiário, compatível com a Battle List e o motor solo. */
export class RegionalMonster extends Slime {
  override readonly kind: RegionalCreatureKind;
  readonly definition: CreatureDefinition;
  private phase = 0;
  private cooldown = 0;
  private windup = 0;
  private enraged = 0;
  private frozenFloor = false;
  private strikesLanded = 0;
  private outOfCombat = 0;
  private regenerationClock = 0;

  constructor(id: string, kind: RegionalCreatureKind, x: number, y: number) {
    super(id, x, y, kind);
    this.kind = kind;
    this.definition = CREATURE_CATALOG[kind];
  }
  get casting(): number { return Math.min(1, this.windup / .42); }
  /** Cactus reflects only actual close-range starter-sword blows. */
  onSwordHit(hero: Player, weapon: "starter" | "forge"): void {
    if (this.definition.special === "cactus-spines" && weapon === "starter")
      hero.receiveThornDamage(2);
  }
  override takeHit(sourceX: number, sourceY: number, damage = 1): void {
    super.takeHit(sourceX, sourceY, damage);
    this.outOfCombat = 0;
    this.regenerationClock = 0;
  }
  /** Aviso visual do golpe à distância, respeitando linha de visão e recarga. */
  override update(dt: number, hero: Player, world: CollisionMap, defense = 0): void {
    if (this.hp <= 0 || hero.hp <= 0 || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, .1);
    this.phase += dt;
    this.hurtTime = Math.max(0, this.hurtTime - dt);
    this.contactCooldown = Math.max(0, this.contactCooldown - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    // Dry-clay trolls regenerate exactly 1 HP/s only after disengaging.
    if (this.definition.special === "clay-chunk") {
      const range = Math.hypot(hero.x-this.x,hero.y-this.y);
      this.outOfCombat = range > 245 ? this.outOfCombat + dt : 0;
      if (this.outOfCombat < 5) this.regenerationClock = 0;
      else {
        this.regenerationClock += dt;
        while (this.regenerationClock >= 1 && this.hp < this.definition.maxHp) {
          this.regenerationClock -= 1;
          this.hp++;
        }
      }
    }
    const dx = hero.x - this.x, dy = hero.y - this.y, d = Math.hypot(dx, dy);
    const ability = this.definition;
    if ((ability.special === "fire" || ability.special === "lava-burst") && this.hp < ability.maxHp * .5) this.enraged = 1;
    const speedBoost = ability.special === "vulture-dive" && hero.hp < hero.maxHp / 2
      ? 1.5 : ability.special === "frost-bite" &&
      (world.speedAt?.(this.x, this.y) ?? 1) < 1 ? 1.3 : 1;
    this.frozenFloor = speedBoost > 1;
    // Não ultrapassar paredes nem caçar alvos de outras áreas do mundo.
    const keepRange=ability.range > 32 && (ability.nature === "magical" ||
      ability.special === "ink" || ability.special === "tidal-lightning" ||
      ability.special === "spore-cloud" || ability.special === "lava-burst");
    const escaping = ability.special === "desert-sand" && this.hp < ability.maxHp * .35 && d < 115;
    if (d < 245 && d > (keepRange ? 70 : 22) &&
        this.hurtTime <= 0 && d > .001) {
      const speed = ability.speed * speedBoost * (1 + .18 * this.enraged);
      moveBody(this, (escaping ? -1 : 1) * dx / d * speed * dt,
        (escaping ? -1 : 1) * dy / d * speed * dt, world);
    }
    const inSight = d <= ability.range && d > .001 && clearPath(this, hero, world);
    if (this.windup > 0) {
      this.windup = Math.max(0, this.windup - dt);
      if (this.windup === 0 && inSight) {
        if (ability.special === "burrow" && d > 44) {
          // Emerging from below: no wall crossing or collision bypass.
          const arrivalX=hero.x-dx/d*27,arrivalY=hero.y-dy/d*27;
          if (world.canMove(arrivalX,arrivalY) &&
              clearPath(this,{x:arrivalX,y:arrivalY},world)) {
            // Emerge at the last safe point in the open corridor.
            this.x=arrivalX;
            this.y=arrivalY;
          }
        }
        // Underground bite is melee. It cannot damage the player from far away
        // when the tunnel is obstructed or an emergence spot is unavailable.
        if (ability.special !== "burrow" ||
            Math.hypot(hero.x-this.x,hero.y-this.y) <= 44)
          this.strike(hero, world, defense, true);
      }
      return;
    }
    const ranged = ability.range > 35 && ability.special !== "none" &&
      (ability.special !== "desert-sand" || this.hp < ability.maxHp * .35);
    if (ranged && this.cooldown === 0 && inSight && d > 36) {
      this.windup = .42;
      this.cooldown = ability.interval + .42;
    }
    if (d <= 29 && this.contactCooldown === 0 && inSight) {
      this.strike(hero, world, defense, false);
      this.contactCooldown = ability.special === "vulture-dive" && hero.hp < hero.maxHp / 2
        ? ability.interval * .65 : ability.interval;
    }
  }
  private strike(hero: Player, world: CollisionMap, defense: number, ranged: boolean): void {
    const d = this.definition;
    const base = d.contactDamage;
    // Rajadas especiais têm alcance, mas nunca atravessam rocha sólida.
    const power = (ranged ? Math.max(1, Math.round(base * .75)) : base) +
      (!ranged && d.special === "sun-spear" ? 2 : 0);
    const hit=hero.takeDamage(Math.max(1, power - defense), this.x, this.y);
    if (!hit) return;
    this.strikesLanded++;
    this.outOfCombat = 0;
    if (d.status) hero.applyStatus(d.status,d.statusSeconds,
      d.special === "viper-venom" ? 2 : 1);
    // Hash of stable monster identity + successful strike count; no Math.random().
    if (d.special === "infectious-bite") {
      const salt = [...this.id].reduce((hash,char) =>
        Math.imul(hash ^ char.charCodeAt(0),16777619),2166136261);
      if (hash2(this.strikesLanded,salt,377) < .10) hero.applyStatus("infection",3);
    }
    if (d.special === "gust") hero.pushFrom(this.x,this.y,32,world);
    if (d.special === "third-knockback" && this.strikesLanded % 3 === 0)
      hero.pushFrom(this.x,this.y,16,world);
    if (d.special === "trample" && Math.hypot(hero.x-this.x,hero.y-this.y)<54)
      hero.applyStatus("stun",.75);
    // Ink is a local accuracy/visibility effect; no random global RNG.
    if (d.special === "ink") hero.applyStatus("blind",4);
    if (d.special === "lava-burst") hero.applyStatus("burn",4);
  }
  /** O Escaravelho explode uma única vez ao morrer. */
  deathBurst(hero: Player, world: CollisionMap, defense = 0): void {
    if (this.definition.special === "solar-burst" &&
        Math.hypot(hero.x - this.x, hero.y - this.y) < 72 &&
        clearPath(this, hero, world))
      hero.takeDamage(Math.max(1, 24 - defense), this.x, this.y);
  }
  get iceSpeedBoost(): boolean { return this.frozenFloor; }
}
/** Weighted draw is deterministic and never changes a creature's own loot probabilities. */
export function selectRegionalSpecies(kinds: readonly RegionalCreatureKind[], roll: number): RegionalCreatureKind | null {
  if (!kinds.length || !Number.isFinite(roll)) return null;
  const weights = kinds.map(kind => Math.max(1, CREATURE_CATALOG[kind].spawnWeight ?? 1));
  const total = weights.reduce((a,b)=>a+b,0);
  let pointer = Math.max(0,Math.min(.999999999,roll))*total;
  for(let i=0;i<kinds.length;i++){
    pointer -= weights[i]!;
    if(pointer < 0)return kinds[i]!;
  }
  return kinds[kinds.length-1]!;
}
/** Seed e células determinam espécies, sem alocação para o mundo inteiro. */
export function regionalSurfaceSpawns(cx: number, cy: number, seed: number): RegionalMonster[] {
  const tx = cx * CHUNK_TILES + Math.floor(CHUNK_TILES / 2);
  const ty = cy * CHUNK_TILES + Math.floor(CHUNK_TILES / 2);
  const southern = getWorldRegion(tx,ty) === "south";
  if (getWorldRegion(tx,ty) === "center" ||
      hash2(cx,cy,seed+441) > (southern ? .86 : .42)) return [];
  const monsters: RegionalMonster[] = [];
  const capacity = southern ? (hash2(cx,cy,seed+453) > .42 ? 3 : 2) :
    (hash2(cx,cy,seed+453) > .81 ? 2 : 1);
  for (let n = 0; n < capacity; n++) {
    const sx = cx * CHUNK_TILES + Math.floor(hash2(cx + n * 13, cy, seed + 469) * CHUNK_TILES);
    const sy = cy * CHUNK_TILES + Math.floor(hash2(cx, cy + n * 17, seed + 479) * CHUNK_TILES);
    const region=getWorldRegion(sx,sy);
    if (region==="center" || villageGround(sx,sy) ||
        !canMoveOnSeed((sx + .5) * TILE_SIZE, (sy + .5) * TILE_SIZE, seed)) continue;
    const biome=getBiomeAt(sx,sy,seed);
    const marsh=caveThemeAt(sx,sy)==="marsh";
    const candidates=REGIONAL_CREATURE_KINDS.filter(kind=>{
      const def=CREATURE_CATALOG[kind];
      return marsh ? def.caveThemes.includes("marsh") :
        def.region===region && def.biomes.includes(biome) &&
        !def.caveThemes.includes("marsh");
    });
    if (!candidates.length) continue;
    const kind=selectRegionalSpecies(candidates,hash2(cx+n*13,cy+n*17,seed+449));
    if (!kind) continue;
    // Habitat and collision are verified at the actual spawn tile, not the chunk center.
    const x = (sx + .5) * TILE_SIZE, y = (sy + .5) * TILE_SIZE;
    monsters.push(new RegionalMonster("regional:" + seed + ":" + cx + ":" + cy + ":" + n,
      kind, x, y));
  }
  return monsters;
}
/** Cavernas da região só recebem suas próprias espécies, com população limitada. */
export function caveMonsterKinds(theme: CaveTheme): readonly RegionalCreatureKind[] {
  return REGIONAL_CREATURE_KINDS.filter(kind => CREATURE_CATALOG[kind].caveThemes.includes(theme));
}
export function rollCreatureLoot(kind: RegionalCreatureKind, id: string): string[] {
  const def = CREATURE_CATALOG[kind];
  const salt = [...id].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);
  return def.loot.filter((entry, i) => hash2(salt, i, 811) < entry.chance).map(entry => entry.item);
}
