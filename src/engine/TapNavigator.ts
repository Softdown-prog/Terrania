import type { CollisionMap } from "../world/collision.ts";

export interface Point { readonly x: number; readonly y: number }
const STEP = 16;
const DIRECTIONS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
] as const;
const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
const cellPoint = (gx: number, gy: number): Point => ({ x: gx * STEP + STEP / 2, y: gy * STEP + STEP / 2 });
const cellKey = (gx: number, gy: number): string => gx + "," + gy;

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
      dist(from, target) > 650 ||
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

  type Entry = { x: number; y: number; g: number; f: number };
  const open: Entry[] = [{ x: start.x, y: start.y, g: 0, f: dist(start.point, target) }];
  const score = new Map<string, number>([[cellKey(start.x, start.y), 0]]);
  const parent = new Map<string, string>();
  const closed = new Set<string>();
  for (let visited = 0; open.length && visited < 2200; visited++) {
    // Fila pequena e limitada: evita dependências e gera rotas determinísticas.
    let best = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[best].f) best = i;
    const current = open.splice(best, 1)[0];
    const key = cellKey(current.x, current.y);
    if (closed.has(key)) continue;
    closed.add(key);
    if (goals.has(key)) {
      const points: Point[] = [];
      let cursor = key;
      while (cursor !== cellKey(start.x, start.y)) {
        const [x, y] = cursor.split(",").map(Number);
        points.push(cellPoint(x, y));
        const previous = parent.get(cursor);
        if (!previous) return null;
        cursor = previous;
      }
      points.reverse();
      points.push(target);
      // Remove curvas desnecessárias sem atravessar colisões.
      const result: Point[] = [];
      let previous = from;
      for (let i = 0; i < points.length;) {
        let next = i;
        for (let j = i + 1; j < points.length; j++) {
          if (clearPath(previous, points[j], collision)) next = j;
        }
        result.push(points[next]);
        previous = points[next];
        i = next + 1;
      }
      return result;
    }
    const center = cellPoint(current.x, current.y);
    for (const [dx, dy] of DIRECTIONS) {
      const x = current.x + dx, y = current.y + dy;
      if (Math.abs(x - fx) > 43 || Math.abs(y - fy) > 43) continue;
      const neighbor = cellPoint(x, y), neighborKey = cellKey(x, y);
      if (closed.has(neighborKey) || !clearPath(center, neighbor, collision)) continue;
      const g = current.g + (dx && dy ? Math.SQRT2 : 1);
      if (g >= (score.get(neighborKey) ?? Infinity)) continue;
      score.set(neighborKey, g);
      parent.set(neighborKey, key);
      open.push({ x, y, g, f: g + dist(neighbor, target) / STEP });
    }
  }
  return null;
}

export class TapNavigator {
  private waypoints: Point[] = [];
  private destination: Point | null = null;
  private last: Point | null = null;
  private stuckFor = 0;

  get target(): Point | null { return this.destination; }

  cancel(): void {
    this.waypoints = [];
    this.destination = null;
    this.last = null;
    this.stuckFor = 0;
  }

  go(from: Point, target: Point, collision: CollisionMap): boolean {
    this.cancel();
    const waypoints = findWalkingPath(from, target, collision);
    if (!waypoints) return false;
    this.waypoints = waypoints;
    this.destination = target;
    this.last = { x: from.x, y: from.y };
    return true;
  }

  direction(at: Point, dt: number): Point {
    const zero = { x: 0, y: 0 };
    if (!this.waypoints.length) return zero;
    while (this.waypoints.length && dist(at, this.waypoints[0]) < 7)
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
    const next = this.waypoints[0], distance = dist(at, next);
    // Aproximação fina impede oscilações e ultrapassagem da marca de destino.
    const intensity = this.waypoints.length === 1 ? Math.min(1, distance / 23) : 1;
    return { x: (next.x - at.x) / distance * intensity, y: (next.y - at.y) / distance * intensity };
  }
}
