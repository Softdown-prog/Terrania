import { TILE_SIZE } from "../../../world/terrain.ts";

/** Para onde e a que distância fica um lugar: o guia de direção do diário e do painel de missão (ADR 0100). */
export interface QuestGuide {
  /** Tiles em linha reta, arredondado (0 = você está lá). */
  readonly tiles: number;
  /** Rosa dos ventos em português: norte para cima, leste para a direita, como no mapa. */
  readonly direction: string;
  readonly arrow: string;
  readonly text: string;
}

const WINDS = [
  ["leste", "→"], ["sudeste", "↘"], ["sul", "↓"], ["sudoeste", "↙"], ["oeste", "←"], ["noroeste", "↖"], ["norte", "↑"], ["nordeste", "↗"],
] as const;
/** A menos de tantos tiles já está "aqui" (ao alcance da tecla de interação). */
export const GUIDE_HERE_TILES = 2;

/** O caminho do herói (em tiles) até um lugar (em unidades do mundo). Entradas inválidas não têm guia. */
export function questGuide(heroTile: { readonly x: number; readonly y: number }, place: { readonly x: number; readonly y: number }): QuestGuide | null {
  if (![heroTile.x, heroTile.y, place.x, place.y].every(Number.isFinite)) return null;
  const dx = place.x / TILE_SIZE - (heroTile.x + .5), dy = place.y / TILE_SIZE - (heroTile.y + .5);
  const tiles = Math.round(Math.hypot(dx, dy));
  if (tiles < GUIDE_HERE_TILES) return { tiles, direction: "aqui", arrow: "●", text: "você está aqui" };
  const octant = Math.round(Math.atan2(dy, dx) / (Math.PI / 4) + 8) % 8, [direction, arrow] = WINDS[octant]!;
  const preposition = direction === "norte" || direction === "sul" ? "ao" : "a";
  return { tiles, direction, arrow, text: `a ${tiles} tiles ${preposition} ${direction}` };
}
