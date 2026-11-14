import { capitalPoint } from "../../../../world/center/capital/index.ts";
import { TILE_SIZE } from "../../../../world/terrain.ts";
import { INLAY } from "./palette.ts";

/** Os anéis da rosa dos ventos incrustada na praça: raio e largura (px) e a cor (azul-real ou dourado). */
export const SUN_RINGS: ReadonlyArray<{ readonly r: number; readonly w: number; readonly tone: "royal" | "gold" }> = [
  { r: 96, w: 8, tone: "royal" }, { r: 112, w: 5, tone: "gold" }, { r: 176, w: 7, tone: "gold" }, { r: 192, w: 3, tone: "royal" },
];
/** Os oito raios: de `from` a `to` px do centro, com `half` px de meia largura na base; os do norte, sul, leste e oeste são dourados e os diagonais, azuis. */
export const SUN_RAYS = { count: 8, from: 122, to: 330, half: 11 } as const;

/**
 * A rosa dos ventos de pedra incrustada na Praça dos Povos (ADR 0057): quatro anéis em volta do monumento e oito raios que
 * saem dele. Cada tile só desenha o pedaço que passa por ele, recortado no tile, então o custo é de poucas operações por tile
 * e a incrustação segue contínua de um tile para o outro. Os raios cardeais apontam para as ruas.
 */
export class PlazaSun {
  private readonly c: CanvasRenderingContext2D;
  constructor(c: CanvasRenderingContext2D) { this.c = c; }

  /** Desenha o que da rosa passa pelo tile do mundo (tx, ty), que está em (x, y) no canvas. */
  draw(x: number, y: number, tx: number, ty: number): void {
    const c = this.c, S = TILE_SIZE, X0 = tx * S, Y0 = ty * S, ctr = capitalPoint(0, 0), cx = ctr.x - X0 + x, cy = ctr.y - Y0 + y;
    const dx0 = X0 - ctr.x, dx1 = X0 + S - ctr.x, dy0 = Y0 - ctr.y, dy1 = Y0 + S - ctr.y;
    const near = Math.hypot(Math.max(dx0, 0, -dx1), Math.max(dy0, 0, -dy1)), far = Math.hypot(Math.max(Math.abs(dx0), Math.abs(dx1)), Math.max(Math.abs(dy0), Math.abs(dy1)));
    for (const ring of SUN_RINGS) {
      if (near > ring.r + ring.w / 2 + 1 || far < ring.r - ring.w / 2 - 1) continue;
      this.clipped(x, y);
      c.beginPath(); c.arc(cx, cy, ring.r, 0, Math.PI * 2);
      c.lineWidth = ring.w + 2; c.strokeStyle = INLAY.groove; c.stroke();
      c.lineWidth = ring.w; c.strokeStyle = ring.tone === "gold" ? INLAY.gold : INLAY.royal; c.stroke();
      c.restore();
    }
    const mid = { x: dx0 + S / 2, y: dy0 + S / 2 }, reach = S * 0.71;
    for (let k = 0; k < SUN_RAYS.count; k++) {
      const a = (k / SUN_RAYS.count) * Math.PI * 2, cos = Math.cos(a), sin = Math.sin(a);
      const t = mid.x * cos + mid.y * sin, perp = -mid.x * sin + mid.y * cos;
      if (t < SUN_RAYS.from - reach || t > SUN_RAYS.to + reach) continue;
      const half = SUN_RAYS.half * Math.max(0, 1 - (t - SUN_RAYS.from) / (SUN_RAYS.to - SUN_RAYS.from));
      if (Math.abs(perp) > half + reach) continue;
      const bx = cx + SUN_RAYS.from * cos, by = cy + SUN_RAYS.from * sin;
      this.clipped(x, y);
      c.beginPath(); c.moveTo(bx - SUN_RAYS.half * sin, by + SUN_RAYS.half * cos); c.lineTo(cx + SUN_RAYS.to * cos, cy + SUN_RAYS.to * sin); c.lineTo(bx + SUN_RAYS.half * sin, by - SUN_RAYS.half * cos); c.closePath();
      c.fillStyle = k % 2 === 0 ? INLAY.goldLight : INLAY.royalLight; c.fill();
      c.strokeStyle = INLAY.outline; c.lineWidth = 1; c.stroke();
      c.restore();
    }
  }

  /** Salva o contexto e recorta o tile (x, y). */
  private clipped(x: number, y: number): void {
    const c = this.c;
    c.save(); c.beginPath(); c.rect(x, y, TILE_SIZE, TILE_SIZE); c.clip();
  }
}
