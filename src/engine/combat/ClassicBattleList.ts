import { CREATURE_CATALOG, type CreatureView } from "../../actors/CreatureCatalog.ts";
import { TILE_SIZE } from "../../world/terrain.ts";

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
  readonly name: string;
  readonly hp: number;
  readonly maxHp: number;
  readonly distanceTiles: number;
}
type Point = Readonly<{ x: number; y: number }>;
export const MAX_BATTLE_CREATURES = 24;
const SPRITE_EDGE = 10;

export function visibleBattleCreatures(
  creatures: Iterable<CreatureView>,
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
    const definition = CREATURE_CATALOG[mob.kind];
    rows.push({
      id: mob.id, name: definition.name,
      hp: Math.min(definition.maxHp, mob.hp), maxHp: definition.maxHp,
      distanceTiles: Math.ceil(Math.hypot(mob.x - hero.x, mob.y - hero.y) / TILE_SIZE),
    });
  }
  rows.sort((a, b) => a.distanceTiles - b.distanceTiles ||
    a.id.localeCompare(b.id));
  return rows.slice(0, MAX_BATTLE_CREATURES);
}
