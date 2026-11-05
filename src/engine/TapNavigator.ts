import type { CollisionMap } from "../world/collision.ts";
import { TILE_SIZE } from "../world/terrain.ts";

export interface Point { readonly x: number; readonly y: number }
const STEP = 16;
const MAX_ROUTE_DISTANCE = 650;
const DIRECTIONS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
] as const;
const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
const cellPoint = (gx: number, gy: number, size = STEP): Point =>
  ({ x: (gx + 0.5) * size, y: (gy + 0.5) * size });
const cellKey = (gx: number, gy: number): string => gx + "," + gy;
const samePoint = (a: Point, b: Point): boolean => a.x === b.x && a.y === b.y;
const tile = (position: number): number => Math.floor(position / TILE_SIZE);

/** Segmento verificado a cada 4 unidades: evita cortar quinas, árvores e móveis. */
export function clearPath(from: Point, to: Point, collision: CollisionMap): boolean {
  if (![from.x, from.y, to.x, to.y].every(Number.isFinite)) return false;
  const count = Math.ceil(dist(from, to) / 4);
  for (let i = 0; i <= count; i++) {
    const t = count === 0 ? 0 : i / count;
    if (!collision.canMove(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t))
      return false;
  }
  return true;
}

/**
 * Busca A* local, limitada a 650 unidades e 2200 nós.
 * Nenhuma dependência de DOM, Canvas, rede ou estado autoritativo multiplayer.
 */
export function findWalkingPath(from: Point, target: Point, collision: CollisionMap): Point[] | null {
  if (![from.x, from.y, target.x, target.y].every(Number.isFinite) ||
      dist(from, target) > MAX_ROUTE_DISTANCE ||
      !collision.canMove(from.x, from.y) || !collision.canMove(target.x, target.y)) return null;
  if (clearPath(from, target, collision)) return [target];

  const fx = Math.round((from.x - STEP / 2) / STEP);
  const fy = Math.round((from.y - STEP / 2) / STEP);
  const tx = Math.round((target.x - STEP / 2) / STEP);
  const ty = Math.round((target.y - STEP / 2) / STEP);
  let start: { x: number; y: number; point: Point } | null = null;
  let nearest = Infinity;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const point = cellPoint(fx + dx, fy + dy);
    const distance = dist(from, point);
    if (distance < nearest && clearPath(from, point, collision)) {
      nearest = distance;
      start = { x: fx + dx, y: fy + dy, point };
    }
  }
  if (!start) return null;

  const goals = new Set<string>();
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const point = cellPoint(tx + dx, ty + dy);
    if (clearPath(point, target, collision)) goals.add(cellKey(tx + dx, ty + dy));
  }
  if (!goals.size) return null;

  const points = searchGrid(
    [{ x: start.x, y: start.y, g: 0, f: dist(start.point, target) / STEP }],
    goals, target, collision, { x: fx, y: fy, size: STEP, maxOffset: 43 },
  );
  if (!points) return null;
  points.push(target);
  // Remove curvas desnecessárias para quem anda com movimento contínuo.
  const result: Point[] = [];
  let previous = from;
  for (let i = 0; i < points.length;) {
    let next = i;
    for (let j = i + 1; j < points.length; j++) {
      const candidate = points[j];
      if (candidate && clearPath(previous, candidate, collision)) next = j;
    }
    const waypoint = points[next];
    if (!waypoint) return null;
    result.push(waypoint);
    previous = waypoint;
    i = next + 1;
  }
  return result;
}

type Entry = { x: number; y: number; g: number; f: number };

function searchGrid(
  open: Entry[], goals: ReadonlySet<string>, target: Point, collision: CollisionMap,
  origin: Point & { size: number; maxOffset: number },
): Point[] | null {
  const { size, maxOffset } = origin;
  const score = new Map(open.map(entry => [cellKey(entry.x, entry.y), entry.g]));
  const parent = new Map<string, string>();
  const closed = new Set<string>();
  for (let visited = 0; open.length && visited < 2200; visited++) {
    // Fila pequena e limitada: evita dependências e gera rotas determinísticas.
    let best = 0;
    let bestScore = open[0]?.f ?? Infinity;
    for (const [i, entry] of open.entries()) {
      if (entry.f < bestScore) { best = i; bestScore = entry.f; }
    }
    const current = open.splice(best, 1)[0];
    if (!current) break;
    const key = cellKey(current.x, current.y);
    if (closed.has(key)) continue;
    closed.add(key);
    if (goals.has(key)) {
      const points: Point[] = [];
      for (let cursor: string | undefined = key; cursor !== undefined; cursor = parent.get(cursor)) {
        const [x, y] = cursor.split(",").map(Number);
        if (x === undefined || y === undefined) return null;
        points.push(cellPoint(x, y, size));
      }
      return points.reverse();
    }
    const center = cellPoint(current.x, current.y, size);
    for (const [dx, dy] of DIRECTIONS) {
      const x = current.x + dx, y = current.y + dy;
      if (Math.abs(x - origin.x) > maxOffset || Math.abs(y - origin.y) > maxOffset) continue;
      const neighbor = cellPoint(x, y, size), neighborKey = cellKey(x, y);
      if (closed.has(neighborKey) || !clearPath(center, neighbor, collision)) continue;
      const g = current.g + (dx && dy ? Math.SQRT2 : 1);
      if (g >= (score.get(neighborKey) ?? Infinity)) continue;
      score.set(neighborKey, g);
      parent.set(neighborKey, key);
      open.push({ x, y, g, f: g + dist(neighbor, target) / size });
    }
  }
  return null;
}

function findTileWalkingPath(
  from: Point, target: Point, collision: CollisionMap, maxDistance: number,
): Point[] | null {
  if (![from.x, from.y, target.x, target.y].every(Number.isFinite) ||
      dist(from, target) > maxDistance ||
      !collision.canMove(from.x, from.y) || !collision.canMove(target.x, target.y)) return null;
  const origin = {
    x: tile(from.x), y: tile(from.y), size: TILE_SIZE,
    maxOffset: Math.ceil(maxDistance / TILE_SIZE) + 1,
  };
  const tx = tile(target.x), ty = tile(target.y);
  if (!samePoint(target, cellPoint(tx, ty, TILE_SIZE))) return null;
  const goal = cellKey(tx, ty);
  if (cellKey(origin.x, origin.y) === goal) return [];

  const starts: Entry[] = [];
  const centered = samePoint(from, cellPoint(origin.x, origin.y, TILE_SIZE));
  // Old saves may start off-center. The first step must reach an adjacent center.
  const offsets = centered ? [[0, 0] as const] : DIRECTIONS;
  for (const [dx, dy] of offsets) {
    const x = origin.x + dx, y = origin.y + dy;
    const point = cellPoint(x, y, TILE_SIZE);
    if (!clearPath(from, point, collision)) continue;
    const g = dist(from, point) / TILE_SIZE;
    starts.push({ x, y, g, f: g + dist(point, target) / TILE_SIZE });
  }
  const path = searchGrid(starts, new Set([goal]), target, collision, origin);
  if (centered) path?.shift();
  return path;
}

export class TapNavigator {
  private waypoints: Point[] = [];
  private destination: Point | null = null;
  private last: Point | null = null;
  private stuckFor = 0;
  private tileSteps = false;

  get target(): Point | null { return this.destination; }

  cancel(): void {
    this.waypoints = [];
    this.destination = null;
    this.last = null;
    this.stuckFor = 0;
  }

  /** Tile routes expect the destination at the center of a tile. */
  go(from: Point, target: Point, collision: CollisionMap, tileSteps = false,
    maxTileDistance = MAX_ROUTE_DISTANCE): boolean {
    this.cancel();
    const waypoints = tileSteps
      ? findTileWalkingPath(from, target, collision, maxTileDistance)
      : findWalkingPath(from, target, collision);
    if (!waypoints) return false;
    if (!waypoints.length) return true;
    this.tileSteps = tileSteps;
    this.waypoints = waypoints;
    this.destination = target;
    this.last = { x: from.x, y: from.y };
    return true;
  }

  direction(at: Point, dt: number, arrivalRadius = 7): Point {
    const zero = { x: 0, y: 0 };
    if (!this.waypoints.length) return zero;
    const radius = Number.isFinite(arrivalRadius) ? Math.max(1, Math.min(23, arrivalRadius)) : 7;
    while (this.waypoints[0] &&
        (this.tileSteps ? samePoint(at, this.waypoints[0]) : dist(at, this.waypoints[0]) < radius))
      this.waypoints.shift();
    if (!this.waypoints.length) {
      this.cancel();
      return zero;
    }
    if (this.last && Number.isFinite(dt) && dt > 0) {
      this.stuckFor = dist(this.last, at) < 0.12 ? this.stuckFor + dt : 0;
      if (this.stuckFor > 0.8) {
        this.cancel();
        return zero;
      }
    }
    this.last = { x: at.x, y: at.y };
    const next = this.waypoints[0];
    if (!next) { this.cancel(); return zero; }
    if (this.tileSteps) {
      const x = tile(next.x) - tile(at.x);
      const y = tile(next.y) - tile(at.y);
      if (Math.abs(x) <= 1 && Math.abs(y) <= 1) return { x, y };
      this.cancel();
      return zero;
    }
    const distance = dist(at, next);
    // Aproximação fina impede oscilações e ultrapassagem da marca de destino.
    const intensity = this.waypoints.length === 1 ? Math.min(1, distance / 23) : 1;
    return { x: (next.x - at.x) / distance * intensity, y: (next.y - at.y) / distance * intensity };
  }
}
