import { Player } from "../actors/Player.ts";
import type { CollisionMap } from "../world/collision.ts";
import { BUILDINGS, type Building } from "../world/village.ts";

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
/** Três interiores distintos, sem itens, recompensas ou dependências de navegador. */
export const ROOM_FURNITURE: Readonly<Record<Building["id"], readonly Furniture[]>> = {
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
  readonly building: Building;
  readonly furniture: readonly Furniture[];
  readonly collision: CollisionMap;
  constructor(buildingId: string) {
    const building = BUILDINGS.find(b => b.id === buildingId);
    if (!building) throw new Error("Interior desconhecido");
    this.building = building;
    this.furniture = ROOM_FURNITURE[building.id];
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
