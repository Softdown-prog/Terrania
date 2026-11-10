import { hash2 } from "./random.ts";
import { isWalkable, TILE_SIZE } from "./terrain.ts";
import { getWorldRegion } from "./regions.ts";
import { canMoveOnSeed } from "./collision.ts";
import { southCitySafe } from "./southCity.ts";

/** A cave has its own finite local space; surface tiles never double as dungeon coordinates. */
export const CAVE_CELL_TILES = 96;
export type CaveTheme = "verdant" | "glacial" | "desert" | "coastal" | "basalt" | "marsh";
export type CaveEntranceKind = "hole" | "stairs" | "ladder";
export interface CaveEntrance {
  readonly id: string;
  readonly tileX: number;
  readonly tileY: number;
  readonly x: number;
  readonly y: number;
  readonly theme: CaveTheme;
  readonly kind: CaveEntranceKind;
  readonly name: string;
  readonly seed: number;
}
const THEMES: Record<CaveTheme, string> = {
  verdant: "Gruta das Raízes", glacial: "Gruta das Geadas",
  desert: "Cripta das Dunas", coastal: "Caverna das Marés",
  basalt: "Galeria das Montanhas", marsh: "Masmorra do Brejo",
};
export function caveThemeAt(tx: number, ty: number): CaveTheme {
  // Southeast transition deserves its own wet underworld, not generic desert/coast.
  if (tx > 9000 && ty > 9000 && tx / ty > .35 && tx / ty < 2.8) return "marsh";
  const region = getWorldRegion(tx, ty);
  return region === "north" ? "glacial" : region === "south" ? "desert" :
    region === "west" ? "basalt" : region === "east" ? "coastal" : "verdant";
}
function safeEntrance(tx: number, ty: number, seed: number): boolean {
  if (southCitySafe(tx,ty)) return false; // cavernas sempre fora da cidade
  if (!canMoveOnSeed((tx + .5) * TILE_SIZE, (ty + .5) * TILE_SIZE, seed)) return false;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      if (!isWalkable(tx + dx, ty + dy, seed)) return false;
  return true;
}
const entranceCache=new Map<string,CaveEntrance|null>();
/** Cached because the scenery and atlas query the same cells each frame. */
export function caveEntranceInCell(cx: number, cy: number, seed: number): CaveEntrance | null {
  if (![cx, cy, seed].every(Number.isSafeInteger) || seed < 0) return null;
  const key=seed+":"+cx+":"+cy;
  if(entranceCache.has(key)) {
    const hit=entranceCache.get(key)!;
    entranceCache.delete(key);
    entranceCache.set(key,hit);
    return hit;
  }
  const result=computeEntrance(cx,cy,seed);
  entranceCache.set(key,result);
  if(entranceCache.size>256)entranceCache.delete(entranceCache.keys().next().value!);
  return result;
}
function computeEntrance(cx:number,cy:number,seed:number):CaveEntrance|null {
  // The first accessible cave is deliberately near, but outside, the starter village.
  const starter = cx === 0 && cy === 0;
  if (!starter && hash2(cx, cy, seed + 1889) > .32) return null;
  const baseX = starter ? 44 : cx * CAVE_CELL_TILES + 17 + Math.floor(hash2(cx, cy, seed + 1901) * 57);
  const baseY = starter ? 11 : cy * CAVE_CELL_TILES + 17 + Math.floor(hash2(cx, cy, seed + 1907) * 57);
  // Fixed probing order prevents map/renderer/discovery from disagreeing.
  for (let i = 0; i < 36; i++) {
    const dx = i === 0 ? 0 : ((i * 7) % 11) - 5;
    const dy = i === 0 ? 0 : ((i * 13) % 11) - 5;
    const tx = baseX + dx, ty = baseY + dy;
    if (Math.floor(tx / CAVE_CELL_TILES) !== cx ||
        Math.floor(ty / CAVE_CELL_TILES) !== cy || !safeEntrance(tx, ty, seed)) continue;
    const theme = caveThemeAt(tx, ty);
    const kinds: CaveEntranceKind[] = theme === "basalt" ? ["stairs","hole","ladder"] :
      theme === "glacial" ? ["hole","ladder","stairs"] :
      theme === "marsh" ? ["ladder","hole","stairs"] : ["hole","stairs","ladder"];
    const kind = kinds[Math.floor(hash2(cx, cy, seed + 1919) * kinds.length)]!;
    return { id: `cave:${seed}:${cx}:${cy}`, tileX: tx, tileY: ty,
      x: (tx + .5) * TILE_SIZE, y: (ty + .5) * TILE_SIZE,
      seed, theme, kind, name: starter ? "Gruta dos Slimes — Treinamento" : THEMES[theme] };
  }
  return null;
}
/** Bounded viewport query. Never enumerate the entire procedural world. */
export function caveEntrancesInArea(minTileX: number, minTileY: number,
  maxTileX: number, maxTileY: number, seed: number): CaveEntrance[] {
  if (![minTileX,minTileY,maxTileX,maxTileY,seed].every(Number.isFinite)) return [];
  const a = Math.floor(minTileX / CAVE_CELL_TILES), b = Math.floor(maxTileX / CAVE_CELL_TILES);
  const c = Math.floor(minTileY / CAVE_CELL_TILES), d = Math.floor(maxTileY / CAVE_CELL_TILES);
  // A badly formed viewport can never cause an unbounded search.
  if (b < a || d < c || (b-a+1)*(d-c+1) > 64) return [];
  const out: CaveEntrance[] = [];
  for (let cy = c; cy <= d; cy++) for (let cx = a; cx <= b; cx++) {
    const entrance = caveEntranceInCell(cx,cy,seed);
    if (entrance && entrance.tileX >= minTileX && entrance.tileX <= maxTileX &&
      entrance.tileY >= minTileY && entrance.tileY <= maxTileY) out.push(entrance);
  }
  return out;
}
export function caveEntranceNear(x: number, y: number, seed: number, radius = 47): CaveEntrance | null {
  if (![x,y,radius].every(Number.isFinite) || radius < 0) return null;
  const entrances = caveEntrancesInArea(
    Math.floor((x-radius)/TILE_SIZE), Math.floor((y-radius)/TILE_SIZE),
    Math.floor((x+radius)/TILE_SIZE), Math.floor((y+radius)/TILE_SIZE), seed);
  return entrances.find(p => Math.hypot(p.x-x,p.y-y) <= radius) ?? null;
}
