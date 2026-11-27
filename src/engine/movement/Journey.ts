import type { CollisionMap } from "../../world/collision.ts";
import { TILE_SIZE } from "../../world/terrain.ts";
import { findWalkingPath, type Point } from "./TapNavigator.ts";

/**
 * Viagem de longa distância (ADR 0099): o herói vai sozinho até um ponto do mapa, em trechos. Cada trecho é um ponto a até `LEG` unidades que o `TapNavigator`
 * (A* local, limite de 650) sabe alcançar; entre os candidatos vence o que deixa o herói mais perto do destino, com uma **memória dos lugares já visitados** que empurra para
 * longe de armadilhas (um lago em U, uma parede comprida): quanto mais um lugar já foi usado, mais caro ele fica, e a viagem acaba escapando. Sem sorteio nem relógio:
 * o mesmo mapa e o mesmo ponto de partida dão sempre a mesma viagem. Não depende de tela nem de rede.
 */
export const JOURNEY_LEG = 560;
/** Perto assim do destino (em unidades) a viagem acabou. */
export const JOURNEY_ARRIVAL = 40;
/** Lado da célula da memória de visitas, em unidades (8 tiles). */
const CELL = TILE_SIZE * 8;
/** Quanto cada visita antiga a uma célula custa, em unidades de distância. */
const VISIT_COST = CELL * .9;
/** Trechos seguidos sem sucesso (sem sair do lugar) até desistir. */
const MAX_FAILURES = 4;
/** Trechos seguidos sem chegar mais perto do que já se chegou (em unidades de ganho) até desistir: o destino não tem caminho (ilha, quarto fechado). */
const MAX_LEGS_WITHOUT_GAIN = 30;
const GAIN = 32;
/** Andou menos que isto entre dois trechos: o trecho não levou a lugar nenhum. */
const MIN_PROGRESS = 10;
const ANGLES = [0, 20, -20, 40, -40, 65, -65, 90, -90, 130, -130, 180].map(degrees => degrees * Math.PI / 180);
const FRACTIONS = [1, .62, .36] as const;
const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
const keyOf = (point: Point): string => Math.floor(point.x / CELL) + "," + Math.floor(point.y / CELL);

export type JourneyPlan =
  | { readonly kind: "arrived" }
  | { readonly kind: "leg"; readonly to: Point }
  | { readonly kind: "stuck" };

export type FindPath = (from: Point, to: Point, collision: CollisionMap) => Point[] | null;
/** Ajusta um ponto candidato antes de testá-lo (o andar por tiles só vai a centros de tile). */
export type SnapPoint = (point: Point) => Point;
const keep: SnapPoint = point => point;

/** O ponto andável mais perto de `target` (até `radius` unidades), para o destino que cai em água ou parede; nada se não houver. */
export function nearestWalkable(target: Point, collision: CollisionMap, radius = TILE_SIZE * 12): Point | null {
  if (!Number.isFinite(target.x) || !Number.isFinite(target.y)) return null;
  if (collision.canMove(target.x, target.y)) return { x: target.x, y: target.y };
  const step = TILE_SIZE / 2;
  for (let ring = step; ring <= radius; ring += step)
    for (let k = 0; k < 16; k++) {
      const angle = k * Math.PI / 8, point = { x: target.x + Math.cos(angle) * ring, y: target.y + Math.sin(angle) * ring };
      if (collision.canMove(point.x, point.y)) return point;
    }
  return null;
}

export class Journey {
  private goal: Point | null = null;
  private visits = new Map<string, number>();
  private failures = 0;
  private lastLegFrom: Point | null = null;
  private bestDistance = Infinity;
  private legsWithoutGain = 0;

  get active(): boolean { return this.goal !== null; }
  get destination(): Point | null { return this.goal; }

  /** Começa uma viagem (sem apagar nada de quem chama; uma viagem nova substitui a anterior). */
  start(goal: Point): boolean {
    if (!Number.isFinite(goal.x) || !Number.isFinite(goal.y)) return false;
    this.cancel();
    this.goal = { x: goal.x, y: goal.y };
    return true;
  }

  cancel(): void {
    this.goal = null;
    this.visits.clear();
    this.failures = 0;
    this.lastLegFrom = null;
    this.bestDistance = Infinity;
    this.legsWithoutGain = 0;
  }

  /** Quanto falta em linha reta, em unidades (0 sem viagem). */
  remaining(at: Point): number { return this.goal ? dist(at, this.goal) : 0; }

  /**
   * O próximo passo da viagem: chegou, um trecho local para o navegador seguir, ou sem saída (a viagem se encerra). Chamado quando o herói não está num trecho.
   * `find` é a busca de caminho local (a do `TapNavigator`; os testes trocam por um dublê) e `snap` ajusta cada ponto candidato (centro de tile, no andar por tiles).
   */
  plan(at: Point, collision: CollisionMap, find: FindPath = findWalkingPath, snap: SnapPoint = keep): JourneyPlan {
    const goal = this.goal;
    if (!goal) return { kind: "arrived" };
    if (!Number.isFinite(at.x) || !Number.isFinite(at.y)) { this.cancel(); return { kind: "stuck" }; }
    const distance = dist(at, goal);
    if (distance < JOURNEY_ARRIVAL) { this.cancel(); return { kind: "arrived" }; }
    // O trecho anterior não levou a lugar nenhum (o navegador desistiu na parede): conta como falha.
    if (this.lastLegFrom && dist(this.lastLegFrom, at) < MIN_PROGRESS) this.failures++;
    else if (this.lastLegFrom) this.failures = 0;
    if (this.failures >= MAX_FAILURES) { this.cancel(); return { kind: "stuck" }; }
    // Muitos trechos sem chegar mais perto do que já se chegou: o destino não tem caminho.
    if (distance < this.bestDistance - GAIN) { this.bestDistance = distance; this.legsWithoutGain = 0; }
    else if (++this.legsWithoutGain > MAX_LEGS_WITHOUT_GAIN) { this.cancel(); return { kind: "stuck" }; }
    this.visits.set(keyOf(at), (this.visits.get(keyOf(at)) ?? 0) + 1);
    const base = Math.atan2(goal.y - at.y, goal.x - at.x);
    let best: { point: Point; score: number } | null = null;
    for (const angle of ANGLES) for (const fraction of FRACTIONS) {
      const length = Math.min(JOURNEY_LEG, distance) * fraction;
      const direct = angle === 0 && fraction === 1 && distance <= JOURNEY_LEG;
      const point = snap(direct ? goal : { x: at.x + Math.cos(base + angle) * length, y: at.y + Math.sin(base + angle) * length });
      if (!collision.canMove(point.x, point.y)) continue;
      const visited = this.visits.get(keyOf(point)) ?? 0;
      const score = dist(point, goal) + visited * VISIT_COST;
      if (best && score >= best.score) continue;
      if (!find(at, point, collision)) continue;
      best = { point, score };
    }
    // Nenhum trecho possível em volta (preso numa quina ou cercado): não há o que tentar.
    if (!best) { this.cancel(); return { kind: "stuck" }; }
    this.lastLegFrom = { x: at.x, y: at.y };
    return { kind: "leg", to: best.point };
  }
}
