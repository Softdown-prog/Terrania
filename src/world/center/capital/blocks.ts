import { CAPITAL, CAPITAL_TILE, capitalPoint, insideCapital } from "./layout.ts";
import { CAPITAL_PLOTS, inPlot } from "./plots.ts";
import { isCapitalWall } from "./streets.ts";
import { isCapitalTowerTile } from "./towers.ts";

/** O monumento da Concórdia, no centro da praça: o raio da base, em tiles (72 px). */
export const CAPITAL_MONUMENT = { radiusTiles: 2.25 } as const;

/**
 * A muralha e as bases das torres são sólidas; a abertura dos portões e as ruas ficam livres. Está ligada à colisão do jogo
 * (`collision.ts`) desde a parte 2 (ADR 0056).
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

/** O monumento da Concórdia é sólido: um círculo de `CAPITAL_MONUMENT.radiusTiles` no centro da praça. Ligado à colisão na parte 3 (ADR 0057). */
export function capitalMonumentBlocks(x: number, y: number, r: number): boolean {
  if (![x, y, r].every(Number.isFinite)) return true;
  const c = capitalPoint(0, 0);
  return Math.hypot(x - c.x, y - c.y) < CAPITAL_MONUMENT.radiusTiles * CAPITAL_TILE + r;
}

/** Tudo o que é sólido na planta: a muralha, as torres e o monumento, mais as fundações de todos os terrenos. No jogo só bloqueiam os terrenos já construídos (`capitalBuildingBlocks`, em `buildings.ts`); os outros ainda não têm arte. */
export function capitalBlocks(x: number, y: number, r: number): boolean {
  if (capitalWallBlocks(x, y, r) || capitalMonumentBlocks(x, y, r)) return true;
  if (![x, y, r].every(Number.isFinite)) return true;
  for (const dx of [-r, r]) for (const dy of [-r, r]) {
    const lx = Math.floor((x + dx) / CAPITAL_TILE) - CAPITAL.centerX, ly = Math.floor((y + dy) / CAPITAL_TILE) - CAPITAL.centerY;
    if (insideCapital(lx, ly) && CAPITAL_PLOTS.some(p => inPlot(p, lx, ly))) return true;
  }
  return false;
}
