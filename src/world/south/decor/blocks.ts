import { TILE_SIZE } from "../../terrain.ts";
import { decorFootprint } from "./footprints.ts";
import { decorShapeOf } from "./shape.ts";
import { southDecorAt } from "./eligibility.ts";

/** Maior raio de uma base (px) mais o maior corpo que anda; define quantos tiles vizinhos precisam ser olhados. */
const REACH = 32;

/**
 * Um corpo de `radius` px em (x, y) esbarra numa peça de decoração que bloqueia (ADR 0037)? Cada peça é um círculo na
 * base, no ponto em que é desenhada; só os tiles ao redor são consultados. É só gameplay: não entra na geração do
 * mundo (as entradas de caverna, por exemplo, não dependem dela).
 */
export function southDecorBlocks(x: number, y: number, radius: number, seed: number): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius)) return false;
  const x0 = Math.floor((x - REACH) / TILE_SIZE), x1 = Math.floor((x + REACH) / TILE_SIZE);
  const y0 = Math.floor((y - REACH) / TILE_SIZE), y1 = Math.floor((y + REACH) / TILE_SIZE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const placement = southDecorAt(tx, ty, seed);
    if (!placement) continue;
    const footprint = decorFootprint(placement.kind, decorShapeOf(placement.variation));
    if (footprint > 0 && Math.hypot(x - (tx * TILE_SIZE + placement.x), y - (ty * TILE_SIZE + placement.y)) < footprint + radius) return true;
  }
  return false;
}
