import { CAPITAL, CAPITAL_TILE, capitalPoint, insideCapital } from "./layout.ts";
import { CAPITAL_PLOTS, inPlot } from "./plots.ts";
import { isCapitalWall } from "./streets.ts";
import { isCapitalTowerTile } from "./towers.ts";

/** O monumento da Concórdia, no centro da praça: raio em tiles. */
export const CAPITAL_MONUMENT = { radiusTiles: 2.5 } as const;

/**
 * A muralha e as bases das torres são sólidas; a abertura dos portões e as ruas ficam livres. Está ligada à colisão do jogo
 * (`collision.ts`) desde que a arte da muralha entrou (ADR 0056). Os edifícios e o monumento ainda não: `capitalBlocks` os
 * inclui, mas só será ligada quando eles forem desenhados, para não haver parede invisível.
 */
export function capitalWallBlocks(x: number, y: number, r: number): boolean {
  if (![x, y, r].every(Number.isFinite)) return true;
  const probe = capitalPoint(0, 0);
  if (Math.abs(x - probe.x) > (CAPITAL.maxX + 4) * CAPITAL_TILE || Math.abs(y - probe.y) > (CAPITAL.maxY + 4) * CAPITAL_TILE) return false;
  for (const dx of [-r, r]) for (const dy of [-r, r]) {
    const lx = Math.floor((x + dx) / CAPITAL_TILE) - CAPITAL.centerX, ly = Math.floor((y + dy) / CAPITAL_TILE) - CAPITAL.centerY;
    if (isCapitalWall(lx, ly) || isCapitalTowerTile(lx, ly)) return true;
  }
  return false;
}

/** Tudo o que é sólido na planta: a muralha e as torres, as fundações dos edifícios e o monumento (os dois últimos ainda sem arte). */
export function capitalBlocks(x: number, y: number, r: number): boolean {
  if (capitalWallBlocks(x, y, r)) return true;
  if (![x, y, r].every(Number.isFinite)) return true;
  const probe = capitalPoint(0, 0);
  for (const dx of [-r, r]) for (const dy of [-r, r]) {
    const lx = Math.floor((x + dx) / CAPITAL_TILE) - CAPITAL.centerX, ly = Math.floor((y + dy) / CAPITAL_TILE) - CAPITAL.centerY;
    if (insideCapital(lx, ly) && CAPITAL_PLOTS.some(p => inPlot(p, lx, ly))) return true;
  }
  return Math.hypot(x - probe.x, y - probe.y) < CAPITAL_MONUMENT.radiusTiles * CAPITAL_TILE + r;
}
