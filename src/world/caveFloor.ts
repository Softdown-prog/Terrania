import type { CollisionMap } from "./collision.ts";
import { TILE_SIZE } from "./terrain.ts";
import { hash2 } from "./random.ts";
import type { CaveEntrance, CaveTheme } from "./caves.ts";
import { carveTowerFloor } from "./towers/floorLayout.ts";

/**
 * Planta de um andar de caverna: paredes, água funda e colisão, sem nenhuma criatura.
 * Fica em `world` (dados e geração do mundo); `engine/rooms/CaveRoom.ts` só povoa e atualiza.
 */
export const CAVE_WIDTH = 42;
export const CAVE_HEIGHT = 30;
export const CAVE_EXIT = { x: 21, y: 26 } as const;
/** Escada para o andar de baixo: a câmara do fundo, no mesmo lugar em todo andar que tem escada. */
export const CAVE_STAIRS_DOWN = { x: 8, y: 8 } as const;
export type CaveCell = 0 | 1 | 2; // wall, floor, deep water
export class CaveFloor {
  readonly cells = new Uint8Array(CAVE_WIDTH * CAVE_HEIGHT);
  readonly collision: CollisionMap;
  readonly entrance: CaveEntrance;
  readonly theme: CaveTheme;
  readonly name: string;
  readonly id: string;
  /** 1 = o andar da entrada, ligado à superfície; os de baixo se ligam ao de cima pela mesma escada de saída. */
  readonly floorIndex: number;
  readonly floorCount: number;
  /** Há escada para baixo em todo andar, menos no último. */
  readonly hasStairsDown: boolean;
  constructor(entrance: CaveEntrance, floorIndex = 1, floorCount = 1) {
    this.entrance = entrance;
    this.theme = entrance.theme;
    this.name = entrance.name;
    this.floorIndex = floorIndex;
    this.floorCount = floorCount;
    this.hasStairsDown = floorIndex < floorCount;
    this.id = entrance.id + ":floor:" + floorIndex;
    // O andar 1 mantém o sal de sempre (os mapas existentes não mudam); os de baixo ganham o seu.
    const salt = (entrance.seed ^ Math.imul(entrance.tileX, 31337) ^ Math.imul(entrance.tileY, 991)) ^
      (floorIndex === 1 ? 0 : Math.imul(floorIndex, 7919));
    const carve = (x: number,y: number,cell: CaveCell = 1): void => {
      if (x > 1 && y > 1 && x < CAVE_WIDTH-2 && y < CAVE_HEIGHT-2)
        this.cells[y*CAVE_WIDTH+x] = cell;
    };
    if (entrance.tower) carveTowerFloor(carve, salt);
    else this.carveCaverns(carve, salt);
    for(let y=CAVE_EXIT.y-5;y<=CAVE_EXIT.y+1;y++)
      for(let x=CAVE_EXIT.x-2;x<=CAVE_EXIT.x+2;x++)carve(x,y);
    // A escada para baixo cabe numa clareira de 7x5 tiles, sempre ligada pelos corredores.
    if(this.hasStairsDown)
      for(let y=CAVE_STAIRS_DOWN.y-2;y<=CAVE_STAIRS_DOWN.y+2;y++)
        for(let x=CAVE_STAIRS_DOWN.x-3;x<=CAVE_STAIRS_DOWN.x+3;x++)carve(x,y);
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
  /** A planta de caverna de sempre, intacta: salas ovais, corredores de 3 tiles e poças nos temas úmidos. */
  private carveCaverns(carve: (x: number, y: number, cell?: CaveCell) => void, salt: number): void {
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
  }
  at(tx:number,ty:number): CaveCell {
    if(!Number.isInteger(tx)||!Number.isInteger(ty)||tx<0||ty<0||tx>=CAVE_WIDTH||ty>=CAVE_HEIGHT)return 0;
    return this.cells[ty*CAVE_WIDTH+tx] as CaveCell;
  }
}
