import { Player } from "../../actors/Player.ts";
import type { CollisionMap } from "../../world/collision.ts";
import { BUILDINGS, type Building } from "../../world/village.ts";
import { SOUTH_BUILDINGS, type SouthBuilding } from "../../world/southCity.ts";

export const ROOM_WIDTH = 360;
export const ROOM_HEIGHT = 264;
export type FurnitureKind = "table" | "shelf" | "bench" | "anvil" | "bed" | "forge";
export interface Furniture {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly kind: FurnitureKind;
}
/** Interiores das fachadas: sem comércio simulado antes da economia estar pronta. */
export const ROOM_FURNITURE: Readonly<Record<string, readonly Furniture[]>> = {
  council: [
    { x: 118, y: 103, width: 124, height: 43, kind: "table" },
    { x: 28, y: 74, width: 68, height: 45, kind: "shelf" },
    { x: 268, y: 85, width: 60, height: 32, kind: "bench" },
  ],
  forge: [
    { x: 27, y: 79, width: 76, height: 60, kind: "forge" },
    { x: 148, y: 103, width: 65, height: 42, kind: "anvil" },
    { x: 266, y: 79, width: 66, height: 49, kind: "table" },
  ],
  inn: [
    { x: 28, y: 78, width: 77, height: 79, kind: "bed" },
    { x: 259, y: 78, width: 73, height: 79, kind: "bed" },
    { x: 139, y: 105, width: 83, height: 39, kind: "table" },
  ],
  market: [
    { x: 30, y: 85, width: 75, height: 44, kind: "shelf" },
    { x: 249, y: 85, width: 76, height: 44, kind: "shelf" },
    { x: 129, y: 105, width: 99, height: 43, kind: "table" },
  ],
  archive: [
    { x: 26, y: 78, width: 65, height: 90, kind: "shelf" },
    { x: 272, y: 78, width: 61, height: 90, kind: "shelf" },
    { x: 131, y: 105, width: 98, height: 41, kind: "table" },
  ],
  clinic: [
    { x: 30, y: 79, width: 75, height: 76, kind: "bed" },
    { x: 256, y: 79, width: 75, height: 76, kind: "bed" },
    { x: 137, y: 105, width: 86, height: 40, kind: "table" },
  ],
  granary: [
    { x: 30, y: 83, width: 76, height: 64, kind: "shelf" },
    { x: 254, y: 83, width: 76, height: 64, kind: "shelf" },
    { x: 137, y: 104, width: 86, height: 35, kind: "table" },
  ],
  "south-fortress":[
    {x:112,y:96,width:136,height:49,kind:"table"},
    {x:28,y:77,width:70,height:67,kind:"shelf"},
    {x:266,y:82,width:66,height:42,kind:"bench"},
  ],
  "south-forge":[
    {x:26,y:81,width:74,height:62,kind:"forge"},
    {x:137,y:102,width:86,height:43,kind:"anvil"},
    {x:264,y:80,width:65,height:46,kind:"table"},
  ],
  "south-inn":[
    {x:27,y:75,width:75,height:81,kind:"bed"},
    {x:260,y:75,width:75,height:81,kind:"bed"},
    {x:135,y:100,width:91,height:46,kind:"table"},
  ],
};
/** A lógica de colisão recebe os mesmos objetos que o Canvas desenha. */
export function interiorCollision(furniture: readonly Furniture[]): CollisionMap {
  return {
    canMove(x: number, y: number): boolean {
      if (!Number.isFinite(x) || !Number.isFinite(y) ||
        x < 23 || x > ROOM_WIDTH - 23 || y < 65 || y > ROOM_HEIGHT - 26) return false;
      const radius = 7;
      return !furniture.some(f =>
        x > f.x - radius && x < f.x + f.width + radius &&
        y > f.y - radius && y < f.y + f.height + radius);
    },
  };
}
/** O motor interno é independente do mundo persistente e do multiplayer. */
export class InteriorRoom {
  readonly player = new Player();
  readonly building: Building|SouthBuilding;
  readonly furniture: readonly Furniture[];
  readonly collision: CollisionMap;
  constructor(buildingId: string) {
    const building = BUILDINGS.find(b => b.id === buildingId) ??
      SOUTH_BUILDINGS.find(b=>b.id===buildingId && b.interior);
    if (!building) throw new Error("Interior desconhecido");
    const furniture=ROOM_FURNITURE[building.id];
    if(!furniture)throw new Error("Mobília não cadastrada");
    this.building = building;
    this.furniture = furniture;
    this.collision = interiorCollision(this.furniture);
    this.player.x = ROOM_WIDTH / 2;
    this.player.y = ROOM_HEIGHT - 53;
    this.player.faceY = -1;
  }
  update(dt: number, movement: { x: number; y: number }): void {
    this.player.update(dt, movement, this.collision);
  }
  get reachedExit(): boolean {
    return Math.abs(this.player.x - ROOM_WIDTH / 2) <= 23 &&
      this.player.y >= ROOM_HEIGHT - 38;
  }
}
