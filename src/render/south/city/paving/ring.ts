import { TILE_SIZE } from "../../../../world/terrain.ts";
import { PLAZA_CENTER, PLAZA_RINGS } from "../../../../world/south/cityPlaza.ts";
import { INLAY_LIGHT, INLAY_TONES, SLAB_DARK } from "./palette.ts";

const TAU = Math.PI * 2;
/** Vão de argamassa entre dois blocos do anel, em pixels. */
const JOINT = 1.4;
/** Fio de luz sobre a crista do anel (cor pronta com transparência, sem `globalAlpha`). */
const LIGHT_FILM = "rgba(255,246,220,0.5)";

/**
 * Anéis de bronze embutidos no piso da praça (ADR 0042), em volta do poço: uma faixa contínua com contorno escuro,
 * blocos separados por juntas, fio de luz do lado da luz e brilho na crista. O anel é desenhado por tile, recortado no
 * tile, com o centro e o raio do mundo, então os pedaços se encaixam na emenda.
 */
export class PlazaRings {
  private readonly c: CanvasRenderingContext2D;
  constructor(c: CanvasRenderingContext2D) { this.c = c; }

  /** Algum anel passa por este tile (origem x, y no canvas; tile tx, ty no mundo)? */
  static touches(tx: number, ty: number): boolean {
    const mx = tx * TILE_SIZE + TILE_SIZE / 2, my = ty * TILE_SIZE + TILE_SIZE / 2, d = Math.hypot(mx - PLAZA_CENTER.x, my - PLAZA_CENTER.y);
    return PLAZA_RINGS.some(r => Math.abs(d - r.radius) < r.half + TILE_SIZE * 0.72);
  }

  /**
   * Período dos blocos de um anel (comprimento de um bloco mais a junta): o círculo é dividido num número inteiro de
   * blocos, então o tracejado fecha a volta sem emenda e todos os tiles concordam onde cada junta cai.
   */
  static period(radius: number): number {
    const circumference = Math.PI * 2 * radius;
    return circumference / Math.max(1, Math.round(circumference / (radius * 0.11 + JOINT)));
  }

  paint(x: number, y: number, tx: number, ty: number): void {
    const c = this.c, T = TILE_SIZE, cx = x + PLAZA_CENTER.x - tx * T, cy = y + PLAZA_CENTER.y - ty * T;
    // o centro do tile em relação ao poço, para traçar só o pedaço do anel que passa por aqui (o círculo inteiro custa caro)
    const mx = x + T / 2 - cx, my = y + T / 2 - cy, around = ((Math.atan2(my, mx) % TAU) + TAU) % TAU;
    c.save(); c.beginPath(); c.rect(x, y, T, T); c.clip();
    for (const ring of PLAZA_RINGS) {
      const mid = ring.radius, w = ring.half * 2, P = PlazaRings.period(mid), step = P / mid;
      const reach = (T * 0.75 + w) / mid, from = Math.floor((around - reach) / step) * step, to = around + reach;
      const arc = (r: number, a0: number, a1: number): void => { c.beginPath(); c.arc(cx, cy, r, a0, a1); };
      c.setLineDash([]);
      arc(mid, from, to); c.strokeStyle = SLAB_DARK; c.lineWidth = w + 3; c.stroke();
      arc(mid, from, to); c.strokeStyle = INLAY_TONES[0]!; c.lineWidth = w; c.stroke();
      // lado de dentro (voltado para a luz do poço) mais claro, lado de fora mais escuro
      arc(mid - w * 0.28, from, to); c.strokeStyle = INLAY_TONES[1]!; c.lineWidth = w * 0.44; c.stroke();
      // juntas entre os blocos, ao longo do anel (o tracejado começa num múltiplo do período: igual em todos os tiles)
      c.setLineDash([P - JOINT, JOINT]);
      arc(mid, from, to); c.strokeStyle = SLAB_DARK; c.lineWidth = 0.9; c.stroke();
      c.setLineDash([]);
      // fios de luz só no trecho voltado para a luz de noroeste, e só quando esse trecho passa por este tile (um arco ao contrário
      // daria quase a volta inteira)
      const lit = (r: number, a: number, b: number, color: string, width: number): void => {
        const lo = Math.max(from, a), hi = Math.min(to, b);
        if (lo >= hi) return;
        arc(r, lo, hi); c.strokeStyle = color; c.lineWidth = width; c.stroke();
      };
      lit(mid - w / 2 + 0.7, Math.PI * 0.95, Math.PI * 1.6, INLAY_LIGHT, 1);
      lit(mid - w * 0.2, Math.PI * 1.05, Math.PI * 1.35, LIGHT_FILM, 0.9);
    }
    c.restore();
  }
}
