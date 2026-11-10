import { resolveSwordStrike, swordStrikeTargets } from "../combat/SwordCombat.ts";
import { SOUTH_COMMON_KINDS, type CreatureKind } from "../../actors/CreatureCatalog.ts";
import { Slime } from "../../actors/Slime.ts";
import { AELA_SLIME_GOAL } from "../../world/aelaQuest.ts";
import { RegionalMonster, caveMonsterKinds } from "../../actors/RegionalMonster.ts";
import { faceTarget } from "../combat/combat.ts";
import type { WeaponId } from "../character/Weapons.ts";

import { Player } from "../../actors/Player.ts";
import type { CollisionMap } from "../../world/collision.ts";
import { CAVE_EXIT, CAVE_HEIGHT, CAVE_WIDTH, CaveFloor } from "../../world/caveFloor.ts";
import { TILE_SIZE } from "../../world/terrain.ts";
import { hash2 } from "../../world/random.ts";
import type { CaveEntrance } from "../../world/caves.ts";

export class CaveRoom {
  readonly floor: CaveFloor;
  readonly player: Player;
  readonly monsters = new Map<string, Slime>();
  readonly collision: CollisionMap;
  private readonly victories: Array<{ kind: CreatureKind; id: string }> = [];
  private readonly defeated: ReadonlySet<string>;
  constructor(entrance:CaveEntrance, hp = 100, maxHp = 100,
    defeated: ReadonlySet<string> = new Set()) {
    this.defeated=defeated;
    this.floor=new CaveFloor(entrance);
    this.collision=this.floor.collision;
    this.player=new Player(maxHp);
    this.player.hp=Math.max(1, Math.min(maxHp,hp));
    this.player.x=(CAVE_EXIT.x+.5)*TILE_SIZE;
    this.player.y=(CAVE_EXIT.y-3+.5)*TILE_SIZE;
    this.player.faceY=-1;
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
    const kinds=caveMonsterKinds(entrance.theme);
    if (!kinds.length) return;
    const salt=entrance.seed ^ Math.imul(entrance.tileX,1033) ^ Math.imul(entrance.tileY,2053);
    // Dois a quatro encontros por andar, fora da escada e somente em solo transitável.
    let viableSpots=0;
    for(let i=0;i<8;i++) {
      const tx=4+Math.floor(hash2(i,7,salt+71)*(CAVE_WIDTH-8));
      const ty=4+Math.floor(hash2(i,11,salt+83)*(CAVE_HEIGHT-12));
      const x=(tx+.5)*TILE_SIZE,y=(ty+.5)*TILE_SIZE;
      if (!this.collision.canMove(x,y) ||
          Math.hypot(x-this.player.x,y-this.player.y)<170) continue;
      if (viableSpots >= 4) break;
      viableSpots++;
      const commons=kinds.filter(kind=>SOUTH_COMMON_KINDS.some(k=>k===kind));
      const source=commons.length && hash2(i,17,salt+109)<.76 ? commons : kinds;
      const kind=source[Math.floor(hash2(i,19,salt+91)*source.length)]!;
      const id=this.floor.id+":mob:"+i;
      if (!this.defeated.has(id)) this.monsters.set(id,new RegionalMonster(id,kind,x,y));
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
  get nearExit():boolean {
    return Math.hypot(this.player.x-(CAVE_EXIT.x+.5)*TILE_SIZE,
      this.player.y-(CAVE_EXIT.y+.5)*TILE_SIZE)<52;
  }
  get reachedExit():boolean {
    return Math.hypot(this.player.x-(CAVE_EXIT.x+.5)*TILE_SIZE,
      this.player.y-(CAVE_EXIT.y+.5)*TILE_SIZE)<13;
  }
}
