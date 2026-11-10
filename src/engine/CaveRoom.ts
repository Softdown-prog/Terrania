import { resolveSwordStrike, swordStrikeTargets } from "./SwordCombat.ts";
import { SOUTH_COMMON_KINDS, type CreatureKind } from "../actors/CreatureCatalog.ts";
import { Slime } from "../actors/Slime.ts";
import { AELA_SLIME_GOAL } from "../world/aelaQuest.ts";
import { RegionalMonster, caveMonsterKinds } from "../actors/RegionalMonster.ts";
import { faceTarget } from "./combat.ts";
import type { WeaponId } from "./Weapons.ts";

import { Player } from "../actors/Player.ts";
import type { CollisionMap } from "../world/collision.ts";
import { TILE_SIZE } from "../world/terrain.ts";
import { hash2 } from "../world/random.ts";
import type { CaveEntrance, CaveTheme } from "../world/caves.ts";

export const CAVE_WIDTH = 42;
export const CAVE_HEIGHT = 30;
export const CAVE_EXIT = { x: 21, y: 26 } as const;
export type CaveCell = 0 | 1 | 2; // wall, floor, deep water
export class CaveFloor {
  readonly cells = new Uint8Array(CAVE_WIDTH * CAVE_HEIGHT);
  readonly collision: CollisionMap;
  readonly entrance: CaveEntrance;
  readonly theme: CaveTheme;
  readonly name: string;
  readonly id: string;
  constructor(entrance: CaveEntrance) {
    this.entrance = entrance;
    this.theme = entrance.theme;
    this.name = entrance.name;
    this.id = entrance.id + ":floor:1";
    const salt = entrance.seed ^ Math.imul(entrance.tileX, 31337) ^ Math.imul(entrance.tileY, 991);
    const carve = (x: number,y: number,cell: CaveCell = 1): void => {
      if (x > 1 && y > 1 && x < CAVE_WIDTH-2 && y < CAVE_HEIGHT-2)
        this.cells[y*CAVE_WIDTH+x] = cell;
    };
    const rooms = [
      {x:21,y:24,rx:7,ry:5},
      {x:12+Math.floor(hash2(1,2,salt)*4),y:16,rx:7,ry:5},
      {x:29,y:11+Math.floor(hash2(2,3,salt)*5),rx:8,ry:5},
      {x:16+Math.floor(hash2(3,4,salt)*9),y:6,rx:8,ry:4},
      {x:8,y:8,rx:5,ry:4},
    ];
    for (const room of rooms)
      for (let y = room.y-room.ry-1; y <= room.y+room.ry+1; y++)
        for (let x = room.x-room.rx-1; x <= room.x+room.rx+1; x++) {
          const r = ((x-room.x)/room.rx)**2 + ((y-room.y)/room.ry)**2;
          if (r < .88 + hash2(x,y,salt+283)*.22) carve(x,y);
        }
    const corridor = (ax:number,ay:number,bx:number,by:number): void => {
      let x=ax,y=ay;
      // Straight connectors and 3-tile width keep all chambers reachable.
      while(x!==bx) {for(let dy=-1;dy<=1;dy++)carve(x,y+dy);x+=Math.sign(bx-x);}
      while(y!==by) {for(let dx=-1;dx<=1;dx++)carve(x+dx,y);y+=Math.sign(by-y);}
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)carve(x+dx,y+dy);
    };
    for(let i=1;i<rooms.length;i++) corridor(rooms[i-1]!.x,rooms[i-1]!.y,rooms[i]!.x,rooms[i]!.y);
    // Small flooded pockets; never flood the guaranteed central passages.
    for(let y=3;y<CAVE_HEIGHT-3;y++)for(let x=3;x<CAVE_WIDTH-3;x++){
      if(this.cells[y*CAVE_WIDTH+x]!==1)continue;
      if(this.theme!=="marsh"&&this.theme!=="coastal"&&this.theme!=="glacial")continue;
      if(Math.abs(x-CAVE_EXIT.x)<5&&Math.abs(y-CAVE_EXIT.y)<7)continue;
      if(Math.min(...rooms.map(r=>Math.hypot((x-r.x)/r.rx,(y-r.y)/r.ry))) < .7)continue;
      if(hash2(x,y,salt+433)> .86)this.cells[y*CAVE_WIDTH+x]=2;
    }
    // Preserve the same connected corridors after wet-pocket decoration.
    for(let i=1;i<rooms.length;i++) corridor(rooms[i-1]!.x,rooms[i-1]!.y,rooms[i]!.x,rooms[i]!.y);
    for(let y=CAVE_EXIT.y-5;y<=CAVE_EXIT.y+1;y++)
      for(let x=CAVE_EXIT.x-2;x<=CAVE_EXIT.x+2;x++)carve(x,y);
    this.collision = {
      canMove: (x:number,y:number):boolean => {
        if(!Number.isFinite(x)||!Number.isFinite(y))return false;
        const r=7;
        return ([-r,r] as const).every(dx=>([-r,r] as const).every(dy=>
          this.at(Math.floor((x+dx)/TILE_SIZE),Math.floor((y+dy)/TILE_SIZE))===1));
      },
      speedAt: ():number => this.theme === "marsh" ? 0.85 : this.theme === "glacial" ? 0.88 : 1,
    };
  }
  at(tx:number,ty:number): CaveCell {
    if(!Number.isInteger(tx)||!Number.isInteger(ty)||tx<0||ty<0||tx>=CAVE_WIDTH||ty>=CAVE_HEIGHT)return 0;
    return this.cells[ty*CAVE_WIDTH+tx] as CaveCell;
  }
}
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
        monster=>this.defeat(monster.id,monster,defense));
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
