import type { Slime } from "../actors/Slime.ts";
import { TILE_SIZE } from "../world/terrain.ts";

/** CLASSIC-003: viewport-only projection for a Battle List.
 * Pure adapter; it neither spawns monsters nor changes combat authority.
 */
export interface BattleViewport {
  readonly centerX: number;
  readonly centerY: number;
  readonly halfWidth: number;
  readonly halfHeight: number;
}
export interface BattleCreature {
  readonly id: string;
  readonly name: "Slime";
  readonly hp: number;
  readonly maxHp: 2;
  readonly distanceTiles: number;
}
type Point = Readonly<{ x: number; y: number }>;
type Creature = Pick<Slime, "id" | "x" | "y" | "hp">;
export const MAX_BATTLE_CREATURES = 24;
const SPRITE_EDGE = 10;

export function visibleBattleCreatures(
  creatures: Iterable<Creature>,
  hero: Point,
  view: BattleViewport,
): BattleCreature[] {
  const values = [hero.x, hero.y, view.centerX, view.centerY, view.halfWidth, view.halfHeight];
  if (!values.every(Number.isFinite) || view.halfWidth <= 0 || view.halfHeight <= 0)
    return [];
  const rows: BattleCreature[] = [];
  for (const mob of creatures) {
    if (!Number.isFinite(mob.x) || !Number.isFinite(mob.y) || !Number.isFinite(mob.hp) ||
        mob.hp <= 0 || !mob.id) continue;
    // A 10px edge allowance includes visible sprite pixels at the screen border.
    if (Math.abs(mob.x - view.centerX) > view.halfWidth + SPRITE_EDGE ||
        Math.abs(mob.y - view.centerY) > view.halfHeight + SPRITE_EDGE) continue;
    rows.push({
      id: mob.id, name: "Slime",
      hp: Math.min(2, Math.max(0, mob.hp)), maxHp: 2,
      distanceTiles: Math.ceil(Math.hypot(mob.x - hero.x, mob.y - hero.y) / TILE_SIZE),
    });
  }
  rows.sort((a, b) => a.distanceTiles - b.distanceTiles ||
    a.id.localeCompare(b.id));
  return rows.slice(0, MAX_BATTLE_CREATURES);
}
