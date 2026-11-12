import { TILE_SIZE } from "../../../../world/terrain.ts";
import { PLAZA_CENTER, PLAZA_RINGS } from "../../../../world/south/cityPlaza.ts";
import { GLINT, INLAY_LIGHT, INLAY_TONES, SLAB_DARK } from "./palette.ts";

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

  paint(x: number, y: number, tx: number, ty: number): void {
    const c = this.c, T = TILE_SIZE, cx = x + PLAZA_CENTER.x - tx * T, cy = y + PLAZA_CENTER.y - ty * T;
    c.save(); c.beginPath(); c.rect(x, y, T, T); c.clip();
    for (const ring of PLAZA_RINGS) {
      const mid = ring.radius, w = ring.half * 2;
      c.setLineDash([]);
      c.beginPath(); c.arc(cx, cy, mid, 0, Math.PI * 2); c.strokeStyle = SLAB_DARK; c.lineWidth = w + 3; c.stroke();
      c.beginPath(); c.arc(cx, cy, mid, 0, Math.PI * 2); c.strokeStyle = INLAY_TONES[0]!; c.lineWidth = w; c.stroke();
      // lado de dentro (voltado para a luz do poço) mais claro, lado de fora mais escuro
      c.beginPath(); c.arc(cx, cy, mid - w * 0.28, 0, Math.PI * 2); c.strokeStyle = INLAY_TONES[1]!; c.lineWidth = w * 0.44; c.stroke();
      // juntas entre os blocos, ao longo do anel
      c.setLineDash([ring.radius * 0.11, 1.4]);
      c.beginPath(); c.arc(cx, cy, mid, 0, Math.PI * 2); c.strokeStyle = SLAB_DARK; c.lineWidth = 0.9; c.stroke();
      c.setLineDash([]);
      c.beginPath(); c.arc(cx, cy, mid - w / 2 + 0.7, Math.PI * 0.95, Math.PI * 1.6); c.strokeStyle = INLAY_LIGHT; c.lineWidth = 1; c.stroke();
      c.beginPath(); c.arc(cx, cy, mid - w * 0.2, Math.PI * 1.05, Math.PI * 1.35); c.strokeStyle = GLINT; c.globalAlpha = 0.5; c.lineWidth = 0.9; c.stroke();
      c.globalAlpha = 1;
    }
    c.restore();
  }
}
