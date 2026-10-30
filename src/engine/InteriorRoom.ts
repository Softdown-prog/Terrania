import { Player } from "../actors/Player.ts";
import type { CollisionMap } from "../world/collision.ts";
import { BUILDINGS, type Building } from "../world/village.ts";

export const ROOM_WIDTH = 360;
export const ROOM_HEIGHT = 264;
export interface Furniture { readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly kind: "table" | "shelf" | "bench"; }
/** Uma sala independente por edifício, sem entidades remotas nem estado de comércio. */
export const FURNITURE: readonly Furniture[] = [
  { x: 125, y: 111, width: 100, height: 35, kind: "table" },
  { x: 33, y: 70, width: 62, height: 42, kind: "shelf" },
  { x: 270, y: 74, width: 55, height: 34, kind: "bench" },
];
export const INTERIOR_COLLISION: CollisionMap = {
  canMove(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 23 || x > ROOM_WIDTH - 23 || y < 65 || y > ROOM_HEIGHT - 26) return false;
    const radius = 7;
    return !FURNITURE.some(f => x > f.x - radius && x < f.x + f.width + radius &&
      y > f.y - radius && y < f.y + f.height + radius);
  },
};
/** Entrada e saída nunca alteram o estado do herói no mundo exterior. */
export class InteriorRoom {
  readonly player = new Player();
  readonly building: Building;
  constructor(buildingId: string) {
    const building = BUILDINGS.find(b => b.id === buildingId);
    if (!building) throw new Error("Interior desconhecido");
    this.building = building;
    this.player.x = ROOM_WIDTH / 2;
    this.player.y = ROOM_HEIGHT - 53;
    this.player.faceY = -1;
  }
  update(dt: number, movement: {x:number; y:number}): void {
    this.player.update(dt, movement, INTERIOR_COLLISION);
  }
  get reachedExit(): boolean {
    return Math.abs(this.player.x - ROOM_WIDTH / 2) <= 23 && this.player.y >= ROOM_HEIGHT - 38;
  }
}
