import { CAPITAL, CAPITAL_TILE, capitalPoint, insideCapital } from "./layout.ts";
import { CAPITAL_PLOTS, inPlot } from "./plots.ts";
import { isCapitalWall } from "./streets.ts";

/** O monumento da Concórdia, no centro da praça: raio em tiles. */
export const CAPITAL_MONUMENT = { radiusTiles: 2.5 } as const;

/**
 * Muralha, fundações dos edifícios e o monumento são sólidos; a abertura dos portões e as ruas ficam livres. Só a planta: ainda
 * não está ligada à colisão do jogo (`collision.ts`), porque a muralha e os edifícios só são desenhados nas partes seguintes e
 * não pode haver parede invisível. Quando a arte entrar, a ligação é esta função, numa linha.
 */
export function capitalBlocks(x: number, y: number, r: number): boolean {
  if (![x, y, r].every(Number.isFinite)) return true;
  const probe = capitalPoint(0, 0);
  if (Math.abs(x - probe.x) > (CAPITAL.maxX + 4) * CAPITAL_TILE || Math.abs(y - probe.y) > (CAPITAL.maxY + 4) * CAPITAL_TILE) return false;
  for (const dx of [-r, r]) for (const dy of [-r, r]) {
    const lx = Math.floor((x + dx) / CAPITAL_TILE) - CAPITAL.centerX, ly = Math.floor((y + dy) / CAPITAL_TILE) - CAPITAL.centerY;
    if (isCapitalWall(lx, ly)) return true;
    if (insideCapital(lx, ly) && CAPITAL_PLOTS.some(p => inPlot(p, lx, ly))) return true;
  }
  return Math.hypot(x - probe.x, y - probe.y) < CAPITAL_MONUMENT.radiusTiles * CAPITAL_TILE + r;
}
