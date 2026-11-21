import { CAPITAL, CAPITAL_TILE } from "./layout.ts";
import { CAPITAL_PLOTS, type CapitalPlot } from "./plots.ts";

/**
 * Os terrenos que já têm edifício desenhado (ADR 0058), na ordem em que foram construídos. Só estes entram na colisão do
 * jogo: terreno sem arte continua livre, para não haver parede invisível. A posição desta lista é a variação da peça.
 */
export const CAPITAL_BUILT = ["ordem-cavaleiros", "quartel", "conselho", "academia-arcana", "arqueiros", "hospedaria", "casa-da-moeda", "templo"] as const;

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

/**
 * Os edifícios em que o herói pode entrar (ADR 0062): só os que têm função de jogo, por decisão do dono (docs/CAPITAL_EDIFICIOS.md).
 * Os outros são fachada: a porta não abre. A lista cresce edifício a edifício, junto com a função e o interior de cada um.
 */
export const CAPITAL_ENTERABLE = ["hospedaria"] as const;

/** O identificador da porta (e do interior) de um edifício da capital: o do terreno com o prefixo `capital-`, para nunca colidir com o da Vila. */
export const capitalDoorId = (plotId: string): string => `capital-${plotId}`;

/** Uma porta da capital: o ponto de onde o herói entra (o meio da frente do edifício, um pouco para a rua, como nas portas da Vila e do Poço Negro). */
export interface CapitalDoor { readonly id: string; readonly name: string; readonly x: number; readonly y: number }
/** O mesmo recuo das portas do Poço Negro: 29 px à frente da base do edifício. */
export const CAPITAL_DOOR_REACH = 29;
export const CAPITAL_DOORS: readonly CapitalDoor[] = CAPITAL_ENTERABLE.map(id => {
  const b = CAPITAL_BUILDINGS.find(o => o.id === id);
  if (!b) throw new RangeError(`porta de um edifício que não está construído: ${id}`);
  return { id: capitalDoorId(id), name: b.name, x: b.x, y: b.y + CAPITAL_DOOR_REACH };
});

/** O que o interior precisa saber do edifício: o identificador, o nome e a variação de cor da sala (a capital usa sempre a 0). */
export interface CapitalInterior { readonly id: string; readonly name: string; readonly variant: number }
/** O interior de uma porta da capital, ou `undefined` se o identificador não é de uma porta que abre. */
export function capitalInteriorFor(doorId: string): CapitalInterior | undefined {
  const door = CAPITAL_DOORS.find(d => d.id === doorId);
  return door ? { id: door.id, name: door.name, variant: 0 } : undefined;
}
