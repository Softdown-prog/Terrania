import { CAPITAL, CAPITAL_TILE } from "./layout.ts";
import { CAPITAL_PLOTS, type CapitalPlot } from "./plots.ts";

/**
 * Os terrenos que já têm edifício desenhado (ADR 0058), na ordem em que foram construídos. Só estes entram na colisão do
 * jogo: terreno sem arte continua livre, para não haver parede invisível. A posição desta lista é a variação da peça.
 */
export const CAPITAL_BUILT = ["ordem-cavaleiros", "quartel", "conselho", "academia-arcana"] as const;

/** Um edifício construído: o terreno dele e, em pixels do mundo, o meio da frente (a base, na borda sul) e o tamanho. */
export interface CapitalBuilding {
  readonly id: string; readonly name: string; readonly plot: CapitalPlot;
  readonly x: number; readonly y: number; readonly width: number; readonly depth: number;
}

/** Os edifícios construídos, com a base na borda sul do terreno (todos ocupam o terreno inteiro). */
export const CAPITAL_BUILDINGS: readonly CapitalBuilding[] = CAPITAL_BUILT.map(id => {
  const plot = CAPITAL_PLOTS.find(p => p.id === id);
  if (!plot) throw new RangeError(`edifício sem terreno na planta: ${id}`);
  return {
    id, name: plot.name, plot,
    x: (CAPITAL.centerX + plot.x + plot.w / 2) * CAPITAL_TILE, y: (CAPITAL.centerY + plot.y + plot.h) * CAPITAL_TILE,
    width: plot.w * CAPITAL_TILE, depth: plot.h * CAPITAL_TILE,
  };
});

/** Os edifícios construídos são sólidos: o terreno inteiro de cada um, mais o corpo de quem anda. Ligado à colisão do jogo (ADR 0058). */
export function capitalBuildingBlocks(x: number, y: number, r: number): boolean {
  if (![x, y, r].every(Number.isFinite)) return true;
  for (const b of CAPITAL_BUILDINGS)
    if (x + r > b.x - b.width / 2 && x - r < b.x + b.width / 2 && y + r > b.y - b.depth && y - r < b.y) return true;
  return false;
}
