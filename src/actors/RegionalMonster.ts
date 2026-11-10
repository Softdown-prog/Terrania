import type { WeaponId } from "../engine/character/Weapons.ts";
import { Slime } from "./Slime.ts";
import { pursuitStep, SPECIES_BEHAVIORS, speciesRetreats } from "../monsters/behavior.ts";
import { duneRatInfectionOnBite } from "../monsters/south/rats/dune-rat.ts";
import { sandGoblinCornered } from "../monsters/south/goblins/sand-goblin.ts";
import { desertOrcClubKnockback, DESERT_ORC_CLUB_PUSH_DISTANCE } from "../monsters/south/orcs/desert-orc.ts";
import { clayTrollRegeneration } from "../monsters/south/trolls/clay-troll.ts";
import { CREATURE_CATALOG, REGIONAL_CREATURE_KINDS, SOUTH_COMMON_KINDS, SOUTH_SURFACE_KINDS,
  sandBeetleBuried, type RegionalCreatureKind, type CreatureDefinition } from "./CreatureCatalog.ts";
import { moveBody, clearPath, canMoveOnSeed, type CollisionMap } from "../world/collision.ts";
import { getWorldRegion } from "../world/regions.ts";
import { getBiomeAt } from "../world/biomes.ts";
import { caveThemeAt, type CaveTheme } from "../world/caves.ts";
import { CHUNK_TILES, TILE_SIZE, getTile } from "../world/terrain.ts";
import { hash2 } from "../world/random.ts";
import type { Player } from "./Player.ts";
import { protectedSurfaceTile } from "../world/village.ts";

/** Instância viva do bestiário, compatível com a Battle List e o motor solo. */
export class RegionalMonster extends Slime {
  override readonly kind: RegionalCreatureKind;
  readonly definition: CreatureDefinition;
  private phase = 0;
  /** Distância percorrida alimenta a animação, não apenas o relógio visual. */
  motionPhase = 0;
  moving = 0;
  private cooldown = 0;
  private windup = 0;
  private enraged = 0;
  private frozenFloor = false;
  private successfulHits = 0;
  private quietSeconds = 0;
  private regenElapsed = 0;
  private readonly strikeSeed: number;

  constructor(id: string, kind: RegionalCreatureKind, x: number, y: number) {
    super(id, x, y, kind);
    this.kind = kind;
    this.definition = CREATURE_CATALOG[kind];
    this.strikeSeed = [...id].reduce((h,ch)=>Math.imul(h^ch.charCodeAt(0),16777619),2166136261);
  }
  get casting(): number { return Math.min(1, this.windup / .42); }
  /** Armadura só contra golpes físicos; DOT elemental continua independente. */
  override get defense(): number {
    return super.defense + (this.kind === "sand-beetle" && sandBeetleBuried(this.hp) ? 2 : 0);
  }
  override takeHit(sourceX: number, sourceY: number, damage = 1): void {
    super.takeHit(sourceX,sourceY,damage);
    this.quietSeconds=0;
    this.regenElapsed=0;
  }
  /** Reflected damage is a consequence of a landed short-sword strike. */
  onSwordHit(hero: Player, weapon: WeaponId, protectVillage = true): void {
    if(protectVillage && protectedSurfaceTile(Math.floor(hero.x/TILE_SIZE),Math.floor(hero.y/TILE_SIZE)))return;
    if(this.definition.special==="thorns" && weapon==="forge")
      hero.receiveThorns(2);
  }
  /** Aviso visual do golpe à distância, respeitando linha de visão e recarga. */
  override update(dt: number, hero: Player, world: CollisionMap, defense = 0, protectVillage = true): void {
    if (this.hp <= 0 || hero.hp <= 0 || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, .1);
    this.tickSwordStatuses(dt);
    if(this.hp<=0)return;
    this.phase += dt;
    this.moving = 0;
    this.quietSeconds += dt;
    if(this.kind==="clay-troll"){
      const regen=clayTrollRegeneration(this.hp,this.definition.maxHp,this.quietSeconds,
        Math.hypot(hero.x-this.x,hero.y-this.y),this.regenElapsed,dt);
      this.hp=regen.hp;
      this.regenElapsed=regen.elapsed;
    }
    this.hurtTime = Math.max(0, this.hurtTime - dt);
    this.contactCooldown = Math.max(0, this.contactCooldown - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    // Mesmo contrato do Slime comum; não aplicar coordenadas da vila em salas de caverna.
    if (protectVillage && (
      protectedSurfaceTile(Math.floor(hero.x / TILE_SIZE), Math.floor(hero.y / TILE_SIZE)) ||
      protectedSurfaceTile(Math.floor(this.x / TILE_SIZE), Math.floor(this.y / TILE_SIZE)))) {
      this.windup = 0;
      return;
    }
    const monsterWorld: CollisionMap = protectVillage ? {
      canMove: (x, y) => !protectedSurfaceTile(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE)) &&
        world.canMove(x, y),
      speedAt: (x, y) => world.speedAt?.(x, y) ?? 1,
    } : world;
    const dx = hero.x - this.x, dy = hero.y - this.y, d = Math.hypot(dx, dy);
    const ability = this.definition;
    if ((ability.special === "fire" || ability.special === "lava-burst") && this.hp < ability.maxHp * .5) this.enraged = 1;
    const speedBoost = ability.special === "frost-bite" &&
      (world.speedAt?.(this.x, this.y) ?? 1) < 1 ? 1.3 : 1;
    this.frozenFloor = speedBoost > 1;
    // Não ultrapassar paredes nem caçar alvos de outras áreas do mundo.
    const retreating=speciesRetreats(this.kind,this.hp,ability.maxHp);
    const frightened=retreating || (this.kind==="sand-goblin" && sandGoblinCornered(this.hp,ability.maxHp));
    if(retreating)this.windup=0;
    const keepRange=ability.range > 32 && (ability.nature === "magical" ||
      ability.special === "ink" || ability.special === "tidal-lightning" ||
      ability.special === "spore-cloud" || ability.special === "lava-burst" ||
      ability.special === "sling" || frightened);
    const beforeX=this.x,beforeY=this.y;
    if(frightened && d>0.001 && d<(retreating ? 170 : 70) && this.hurtTime<=0) {
      // Fuga da espécie, sem ultrapassar colisão nem ignorar a física.
      const flee=pursuitStep(this.kind,this.phase,-dx,-dy,d);
      moveBody(this,flee.x*ability.speed*dt*flee.pace,
        flee.y*ability.speed*dt*flee.pace,monsterWorld);
    } else if (d < 245 && d > (keepRange ? 70 : 22) &&
        this.hurtTime <= 0 && d > .001) {
      const vultureRage=ability.special==="carrion-dive" && hero.hp < hero.maxHp*.5 ? 1.45 : 1;
      const speed = ability.speed * this.swordSpeedMultiplier * speedBoost * vultureRage * (1 + .18 * this.enraged);
      const step=pursuitStep(this.kind,this.phase,dx,dy,d);
      moveBody(this,step.x*speed*step.pace*dt,step.y*speed*step.pace*dt,monsterWorld);
    }
    const traveled=Math.hypot(this.x-beforeX,this.y-beforeY);
    if(traveled>.001){
      this.moving=Math.min(1,traveled/Math.max(.001,ability.speed*dt));
      this.motionPhase+=traveled/TILE_SIZE*SPECIES_BEHAVIORS[this.kind].cadence*Math.PI*2;
    }
    if(retreating)return;
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
      (ability.special!=="sand-throw" || sandGoblinCornered(this.hp,ability.maxHp));
    if (ranged && this.cooldown === 0 && inSight && d > 36) {
      this.windup = .42;
      this.cooldown = ability.interval + .42;
    }
    if (d <= 29 && this.contactCooldown === 0 && inSight) {
      this.strike(hero, world, defense, false);
      this.contactCooldown = ability.interval * (ability.special==="carrion-dive" &&
        hero.hp < hero.maxHp*.5 ? .72 : 1);
    }
  }
  private strike(hero: Player, world: CollisionMap, defense: number, ranged: boolean): void {
    const d = this.definition;
    const base = d.contactDamage;
    // Rajadas especiais têm alcance, mas nunca atravessam rocha sólida.
    const power = (ranged ? Math.max(1, Math.round(base * .75)) : base) +
      (!ranged && d.special==="sun-spear" ? 2 : 0);
    const hit=hero.takeDamage(Math.max(1, power - defense), this.x, this.y);
    if (!hit) return;
    this.successfulHits++;
    // Infection is 10% per successful bite, rolled from monster ID and hit count.
    if(this.kind==="dune-rat"){
      if(duneRatInfectionOnBite(this.strikeSeed,this.successfulHits))
        hero.applyStatus("infection",d.statusSeconds);
    } else if(d.status) hero.applyStatus(d.status,d.statusSeconds);
    if(this.kind==="desert-orc" && !ranged && desertOrcClubKnockback(this.successfulHits))
      hero.pushFrom(this.x,this.y,DESERT_ORC_CLUB_PUSH_DISTANCE,world);
    if (d.special === "gust") hero.pushFrom(this.x,this.y,32,world);
    if (d.special === "trample" && Math.hypot(hero.x-this.x,hero.y-this.y)<54)
      hero.applyStatus("stun",.75);
    // Ink is a local accuracy/visibility effect; no random global RNG.
    if (d.special === "ink") hero.applyStatus("blind",4);
    if (d.special === "lava-burst") hero.applyStatus("burn",4);
  }
  /** O Escaravelho explode uma única vez ao morrer. */
  deathBurst(hero: Player, world: CollisionMap, defense = 0, protectVillage = true): void {
    if (protectVillage && protectedSurfaceTile(Math.floor(hero.x/TILE_SIZE),Math.floor(hero.y/TILE_SIZE)))return;
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
  if (getWorldRegion(tx,ty) === "center" || hash2(cx,cy,seed+441) > .42) return [];
  const monsters: RegionalMonster[] = [];
  for (let n = 0; n < (hash2(cx, cy, seed + 453) > .81 ? 2 : 1); n++) {
    const sx = cx * CHUNK_TILES + Math.floor(hash2(cx + n * 13, cy, seed + 469) * CHUNK_TILES);
    const sy = cy * CHUNK_TILES + Math.floor(hash2(cx, cy + n * 17, seed + 479) * CHUNK_TILES);
    const region=getWorldRegion(sx,sy);
    if (region==="center" || protectedSurfaceTile(sx,sy) ||
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
    const kind=candidates[Math.floor(hash2(cx+n*13,cy+n*17,seed+449)*candidates.length)]!;
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

/** Starter/intermediate South population: many cheap creatures, distinct IDs from elites.
 * Spawns use actual tile biomes, collision and region, never a fabricated landmark.
 * At most three attempts per chunk, independent of camera frame timing.
 */
export function southCommonSpawns(cx:number,cy:number,seed:number): RegionalMonster[] {
  if(![cx,cy,seed].every(Number.isSafeInteger))return [];
  const centerX=cx*CHUNK_TILES+Math.floor(CHUNK_TILES/2);
  const centerY=cy*CHUNK_TILES+Math.floor(CHUNK_TILES/2);
  if(getWorldRegion(centerX,centerY)!=="south" ||
     hash2(cx,cy,seed+23331)>.86)return [];
  const out:RegionalMonster[]=[];
  const count=hash2(cx,cy,seed+23337)<.32?3:2;
  for(let i=0;i<count;i++){
    const tx=cx*CHUNK_TILES+Math.floor(hash2(cx*17+i*5,cy,seed+23341)*CHUNK_TILES);
    const ty=cy*CHUNK_TILES+Math.floor(hash2(cx,cy*19+i*7,seed+23343)*CHUNK_TILES);
    if(getWorldRegion(tx,ty)!=="south" || protectedSurfaceTile(tx,ty) ||
       !canMoveOnSeed((tx+.5)*TILE_SIZE,(ty+.5)*TILE_SIZE,seed))continue;
    const theme=caveThemeAt(tx,ty),biome=getBiomeAt(tx,ty,seed);
    const eligible=[...SOUTH_COMMON_KINDS,...SOUTH_SURFACE_KINDS].filter(kind=>{
      const def=CREATURE_CATALOG[kind];
      if (kind === "sand-beetle")
        return theme === "desert" && (def.biomes.includes(biome) ||
          getTile(tx,ty,seed).ground === "path");
      return def.caveThemes.includes(theme) && def.biomes.includes(biome);
    });
    if(!eligible.length)continue;
    const pick=Math.floor(hash2(cx*7+i*11,cy*13+i*17,seed+23347)*eligible.length);
    const kind=eligible[pick]!;
    out.push(new RegionalMonster("south-common:"+seed+":"+cx+":"+cy+":"+i,
      kind,(tx+.5)*TILE_SIZE,(ty+.5)*TILE_SIZE));
  }
  return out;
}
