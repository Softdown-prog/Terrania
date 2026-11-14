import { TILE_SIZE } from "../../../../world/terrain.ts";
import { CURB } from "./palette.ts";

/** Quais lados de um tile encostam em chão que não é piso (o meio-fio vai nesses lados). */
export interface PavedEdges { readonly n: boolean; readonly e: boolean; readonly s: boolean; readonly w: boolean }
export const NO_EDGES: PavedEdges = { n: false, e: false, s: false, w: false };
/** Largura do meio-fio (do lado do piso) e da sombra dele no gramado, em px. */
export const CURB_WIDTH = 4, VERGE_WIDTH = 5;

/**
 * Meio-fio de calcário e a sombra dele no gramado (ADR 0057). São métodos de uma classe porque o portão de arte exige
 * registrar toda função exportada que recebe um Canvas, e a peça aqui é o piso. Cada lado leva três retângulos: o corpo,
 * o fio de luz de noroeste e o fio de sombra.
 */
export class CapitalCurb {
  private readonly c: CanvasRenderingContext2D;
  constructor(c: CanvasRenderingContext2D) { this.c = c; }

  /** O meio-fio nos lados do tile de piso (x, y) que encostam no gramado. */
  draw(x: number, y: number, edges: PavedEdges): void {
    const c = this.c, W = CURB_WIDTH, S = TILE_SIZE;
    if (edges.n) { c.fillStyle = CURB.body; c.fillRect(x, y, S, W); c.fillStyle = CURB.light; c.fillRect(x, y, S, 1); c.fillStyle = CURB.dark; c.fillRect(x, y + W - 1, S, 1); }
    if (edges.s) { c.fillStyle = CURB.body; c.fillRect(x, y + S - W, S, W); c.fillStyle = CURB.light; c.fillRect(x, y + S - W, S, 1); c.fillStyle = CURB.dark; c.fillRect(x, y + S - 1, S, 1); }
    if (edges.w) { c.fillStyle = CURB.body; c.fillRect(x, y, W, S); c.fillStyle = CURB.light; c.fillRect(x, y, 1, S); c.fillStyle = CURB.dark; c.fillRect(x + W - 1, y, 1, S); }
    if (edges.e) { c.fillStyle = CURB.body; c.fillRect(x + S - W, y, W, S); c.fillStyle = CURB.light; c.fillRect(x + S - W, y, 1, S); c.fillStyle = CURB.dark; c.fillRect(x + S - 1, y, 1, S); }
  }

  /** A sombra suave do piso no gramado do tile (x, y), nos lados em que o piso encosta. */
  verge(x: number, y: number, sides: PavedEdges): void {
    const c = this.c, V = VERGE_WIDTH, S = TILE_SIZE;
    c.fillStyle = CURB.shade;
    if (sides.n) c.fillRect(x, y, S, V);
    if (sides.s) c.fillRect(x, y + S - V, S, V);
    if (sides.w) c.fillRect(x, y, V, S);
    if (sides.e) c.fillRect(x + S - V, y, V, S);
  }
}
