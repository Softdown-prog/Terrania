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

  constructor(id: string, kind: RegionalCreatureKind, x: number, y: number) {
    super(id, x, y, kind);
    this.kind = kind;
    this.definition = CREATURE_CATALOG[kind];
  }
  get casting(): number { return Math.min(1, this.windup / .42); }
  /** Aviso visual do golpe à distância, respeitando linha de visão e recarga. */
  override update(dt: number, hero: Player, world: CollisionMap, defense = 0): void {
    if (this.hp <= 0 || hero.hp <= 0 || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, .1);
    this.phase += dt;
    this.hurtTime = Math.max(0, this.hurtTime - dt);
    this.contactCooldown = Math.max(0, this.contactCooldown - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    const dx = hero.x - this.x, dy = hero.y - this.y, d = Math.hypot(dx, dy);
    const ability = this.definition;
    if ((ability.special === "fire" || ability.special === "lava-burst") && this.hp < ability.maxHp * .5) this.enraged = 1;
    const speedBoost = ability.special === "frost-bite" &&
      (world.speedAt?.(this.x, this.y) ?? 1) < 1 ? 1.3 : 1;
    this.frozenFloor = speedBoost > 1;
    // Não ultrapassar paredes nem caçar alvos de outras áreas do mundo.
    const keepRange=ability.range > 32 && (ability.nature === "magical" ||
      ability.special === "ink" || ability.special === "tidal-lightning" ||
      ability.special === "spore-cloud" || ability.special === "lava-burst");
    if (d < 245 && d > (keepRange ? 70 : 22) &&
        this.hurtTime <= 0 && d > .001) {
      const speed = ability.speed * speedBoost * (1 + .18 * this.enraged);
      moveBody(this, dx / d * speed * dt, dy / d * speed * dt, world);
    }
    const inSight = d <= ability.range && d > .001 && clearPath(this, hero, world);
    if (this.windup > 0) {
      this.windup = Math.max(0, this.windup - dt);
      if (this.windup === 0 && inSight) {
        if (ability.special === "burrow" && d > 44) {
          // Emerging from below: no wall crossing or collision bypass.
          const arrivalX=hero.x-dx/d*27,arrivalY=hero.y-dy/d*27;
          if (world.canMove(arrivalX,arrivalY))
            moveBody(this,arrivalX-this.x,arrivalY-this.y,world);
        }
        this.strike(hero, world, defense, true);
      }
      return;
    }
    const ranged = ability.range > 35 && ability.special !== "none";
    if (ranged && this.cooldown === 0 && inSight && d > 36) {
      this.windup = .42;
      this.cooldown = ability.interval + .42;
    }
    if (d <= 29 && this.contactCooldown === 0 && inSight) {
      this.strike(hero, world, defense, false);
      this.contactCooldown = ability.interval;
    }
  }
  private strike(hero: Player, world: CollisionMap, defense: number, ranged: boolean): void {
    const d = this.definition;
    const base = d.contactDamage;
    // Rajadas especiais têm alcance, mas nunca atravessam rocha sólida.
    const power = ranged ? Math.max(1, Math.round(base * .75)) : base;
    const hit=hero.takeDamage(Math.max(1, power - defense), this.x, this.y);
    if (!hit) return;
    if (d.status) hero.applyStatus(d.status,d.statusSeconds);
    if (d.special === "gust") hero.pushFrom(this.x,this.y,32,world);
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
/** Seed e células determinam espécies, sem alocação para o mundo inteiro. */
export function regionalSurfaceSpawns(cx: number, cy: number, seed: number): RegionalMonster[] {
  const tx = cx * CHUNK_TILES + Math.floor(CHUNK_TILES / 2);
  const ty = cy * CHUNK_TILES + Math.floor(CHUNK_TILES / 2);
  const region = getWorldRegion(tx, ty);
  if (region === "center" || hash2(cx, cy, seed + 441) > .42) return [];
  const biome = getBiomeAt(tx, ty, seed);
  const marsh = caveThemeAt(tx,ty)==="marsh";
  const candidates = REGIONAL_CREATURE_KINDS.filter(kind => {
    const def = CREATURE_CATALOG[kind];
    if (marsh) return def.caveThemes.includes("marsh");
    return def.region === region && def.biomes.includes(biome) &&
      !def.caveThemes.includes("marsh");
  });
  if (!candidates.length) return [];
  const kind = candidates[Math.floor(hash2(cx, cy, seed + 449) * candidates.length)]!;
  const monsters: RegionalMonster[] = [];
  for (let n = 0; n < (hash2(cx, cy, seed + 453) > .81 ? 2 : 1); n++) {
    const sx = cx * CHUNK_TILES + Math.floor(hash2(cx + n * 13, cy, seed + 469) * CHUNK_TILES);
    const sy = cy * CHUNK_TILES + Math.floor(hash2(cx, cy + n * 17, seed + 479) * CHUNK_TILES);
    if (villageGround(sx, sy) || !canMoveOnSeed((sx + .5) * TILE_SIZE, (sy + .5) * TILE_SIZE, seed)) continue;
    // A colisão é verificada na fábrica, não depois de apresentar uma criatura presa.
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
