import { resolveSwordStrike, swordStrikeTargets } from "../combat/SwordCombat.ts";
import { SOUTH_COMMON_KINDS, type CreatureKind } from "../../actors/CreatureCatalog.ts";
import { Slime } from "../../actors/Slime.ts";
import { AELA_SLIME_GOAL } from "../../world/aelaQuest.ts";
import { RegionalMonster, caveMonsterKinds } from "../../actors/RegionalMonster.ts";
import { faceTarget } from "../combat/combat.ts";
import type { WeaponId } from "../character/Weapons.ts";

import { Player } from "../../actors/Player.ts";
import type { CollisionMap } from "../../world/collision.ts";
import { CAVE_EXIT, CAVE_HEIGHT, CAVE_STAIRS_DOWN, CAVE_WIDTH, CaveFloor } from "../../world/caveFloor.ts";
import { caveFloorCount, dungeonFloor } from "../../dungeons/index.ts";
import { TILE_SIZE } from "../../world/terrain.ts";
import { hash2 } from "../../world/random.ts";
import type { CaveEntrance } from "../../world/caves.ts";

/** De onde o herói chega ao andar: de cima (desceu ou entrou pela superfície) ou de baixo (subiu). */
export type CaveArrival = "above" | "below";
export interface CaveRoomOptions {
  /** 1 = o andar da entrada. */
  readonly floorIndex?: number;
  readonly arrivedFrom?: CaveArrival;
}
const pixel = (tile: { readonly x: number; readonly y: number }): { x: number; y: number } =>
  ({ x: (tile.x + .5) * TILE_SIZE, y: (tile.y + .5) * TILE_SIZE });
export class CaveRoom {
  readonly floor: CaveFloor;
  readonly player: Player;
  readonly monsters = new Map<string, Slime>();
  readonly collision: CollisionMap;
  readonly floorIndex: number;
  readonly floorCount: number;
  /** Nome do andar (da masmorra) ou, em caverna comum, o da própria caverna. */
  readonly floorName: string;
  private readonly victories: Array<{ kind: CreatureKind; id: string }> = [];
  private readonly defeated: ReadonlySet<string>;
  constructor(entrance:CaveEntrance, hp = 100, maxHp = 100,
    defeated: ReadonlySet<string> = new Set(), options: CaveRoomOptions = {}) {
    this.defeated=defeated;
    this.floorCount=caveFloorCount(entrance);
    this.floorIndex=Math.max(1,Math.min(this.floorCount,Math.floor(options.floorIndex ?? 1)));
    this.floorName=dungeonFloor(entrance,this.floorIndex)?.name ?? entrance.name;
    this.floor=new CaveFloor(entrance,this.floorIndex,this.floorCount);
    this.collision=this.floor.collision;
    this.player=new Player(maxHp);
    this.player.hp=Math.max(1, Math.min(maxHp,hp));
    // Quem sobe chega ao lado da escada que desce; quem desce (ou entra) chega ao pé da escada de saída.
    const below=options.arrivedFrom==="below" && this.floor.hasStairsDown;
    const arrival=below ? pixel({x:CAVE_STAIRS_DOWN.x+3,y:CAVE_STAIRS_DOWN.y}) : pixel({x:CAVE_EXIT.x,y:CAVE_EXIT.y-3});
    this.player.x=arrival.x;
    this.player.y=arrival.y;
    this.player.faceY=below ? 0 : -1;
    this.player.faceX=below ? -1 : 0;
    this.populate(entrance);
  }
  private populate(entrance: CaveEntrance): void {
    if (entrance.id === `cave:${entrance.seed}:0:0`) {
      // Sete encontros de treino, com locais garantidamente transitáveis.
      const spots: Array<{ x: number; y: number }> = [];
      for (let ty = 5; ty <= 23 && spots.length < AELA_SLIME_GOAL + 2; ty += 2)
        for (let tx = 6; tx <= 36 && spots.length < AELA_SLIME_GOAL + 2; tx += 2) {
          const x = (tx + .5) * TILE_SIZE, y = (ty + .5) * TILE_SIZE;
          if (!this.collision.canMove(x, y) ||
              Math.hypot(x - this.player.x, y - this.player.y) < 210 ||
              spots.some(point => Math.hypot(x - point.x, y - point.y) < 92)) continue;
          spots.push({ x, y });
        }
      for (const [i, spot] of spots.entries()) {
        const id = this.floor.id + ":slime:" + i;
        if (!this.defeated.has(id)) this.monsters.set(id, new Slime(id, spot.x, spot.y));
      }
      return;
    }
    const plan=dungeonFloor(entrance,this.floorIndex);
    const kinds=plan ? plan.monsters : caveMonsterKinds(entrance.theme);
    if (!kinds.length) return;
    const salt=entrance.seed ^ Math.imul(entrance.tileX,1033) ^ Math.imul(entrance.tileY,2053) ^
      (this.floorIndex===1 ? 0 : Math.imul(this.floorIndex,6361));
    const wanted=plan?.encounters ?? 4;
    const stairs=this.floor.hasStairsDown ? pixel(CAVE_STAIRS_DOWN) : null;
    // Encontros por andar, fora das escadas e somente em solo transitável.
    let viableSpots=0;
    // Cavernas sem masmorra mantêm as 8 tentativas de sempre; as masmorras precisam de mais para os 4 a 5 encontros.
    for(let i=0;i<(plan ? 16 : 8);i++) {
      const tx=4+Math.floor(hash2(i,7,salt+71)*(CAVE_WIDTH-8));
      const ty=4+Math.floor(hash2(i,11,salt+83)*(CAVE_HEIGHT-12));
      const x=(tx+.5)*TILE_SIZE,y=(ty+.5)*TILE_SIZE;
      if (!this.collision.canMove(x,y) ||
          Math.hypot(x-this.player.x,y-this.player.y)<170 ||
          (stairs && Math.hypot(x-stairs.x,y-stairs.y)<130)) continue;
      if (viableSpots >= wanted) break;
      viableSpots++;
      const commons=kinds.filter(kind=>SOUTH_COMMON_KINDS.some(k=>k===kind));
      const source=!plan && commons.length && hash2(i,17,salt+109)<.76 ? commons : kinds;
      const kind=source[Math.floor(hash2(i,19,salt+91)*source.length)]!;
      const id=this.floor.id+":mob:"+i;
      if (!this.defeated.has(id)) this.monsters.set(id,new RegionalMonster(id,kind,x,y));
    }
    // O chefe espera na câmara do fundo, onde nos andares de cima fica a escada.
    if (plan?.boss) {
      const id=this.floor.id+":boss", spot=pixel(CAVE_STAIRS_DOWN);
      if (!this.defeated.has(id)) this.monsters.set(id,new RegionalMonster(id,plan.boss,spot.x,spot.y));
    }
    // Garantia de encontro nas câmaras, caso o hash caia só em paredes.
    if(!this.monsters.size && viableSpots===0){
      for(let y=5;y<22 && !this.monsters.size;y++) for(let x=5;x<38 && !this.monsters.size;x++){
        if(!this.collision.canMove((x+.5)*TILE_SIZE,(y+.5)*TILE_SIZE))continue;
        const kind=kinds[Math.floor(hash2(x,y,salt+99)*kinds.length)]!;
        const id=this.floor.id+":mob:0";
        if (!this.defeated.has(id)) this.monsters.set(id,new RegionalMonster(id,kind,(x+.5)*TILE_SIZE,(y+.5)*TILE_SIZE));
      }
    }
  }
  drainVictories(): Array<{kind:CreatureKind;id:string}> {
    return this.victories.splice(0);
  }
  update(dt:number,movement:{x:number;y:number},attack=false,weapon:WeaponId="starter",defense=0,
    targetId?: string | null):void {
    if(!Number.isFinite(dt)||dt<=0||this.player.hp<=0)return;
    dt=Math.min(dt,.1);
    this.player.update(dt,movement,this.collision);
    if(attack)this.player.startAttack(weapon);
    for(const [id,monster] of this.monsters){
      monster.update(dt,this.player,this.collision,defense,false);
      if(monster.hp<=0)this.defeat(id,monster,defense);
    }
    if(this.player.consumeStrike()){
      const equipped=this.player.attackWeapon;
      const targets=swordStrikeTargets(equipped,this.player,this.monsters.values(),
        this.collision,targetId);
      // O herói encara o alvo principal; os demais do arco astral não giram o golpe.
      if(targets[0])faceTarget(this.player,targets[0]);
      resolveSwordStrike(equipped,this.player,targets,this.monsters,this.collision,
        monster=>this.defeat(monster.id,monster,defense),false);
    }
  }
  /** One kill event even if DOT, direct hit and chained lightning overlap. */
  private defeat(id:string,monster:Slime,defense:number):void {
    if(!this.monsters.has(id))return;
    // A explosão final respeita a armadura, como na superfície.
    if (monster instanceof RegionalMonster)monster.deathBurst(this.player,this.collision,defense,false);
    this.monsters.delete(id);
    this.victories.push({kind:monster.kind,id});
  }
  /** A escada de saída: no andar 1 leva à superfície; nos de baixo, ao andar de cima. */
  get nearExit():boolean {
    return this.distanceTo(CAVE_EXIT)<52;
  }
  get reachedExit():boolean {
    return this.distanceTo(CAVE_EXIT)<13;
  }
  get nearStairsDown():boolean {
    return this.floor.hasStairsDown && this.distanceTo(CAVE_STAIRS_DOWN)<52;
  }
  get reachedStairsDown():boolean {
    return this.floor.hasStairsDown && this.distanceTo(CAVE_STAIRS_DOWN)<13;
  }
  private distanceTo(tile:{readonly x:number;readonly y:number}):number {
    const at=pixel(tile);
    return Math.hypot(this.player.x-at.x,this.player.y-at.y);
  }
}
