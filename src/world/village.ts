/** Planta compartilhada: cidade, zonas seguras e trilha da gruta introdutória. */
export const VILLAGE_BOUNDS = { minX: 0, maxX: 38, minY: -12, maxY: 18 } as const;
export const BUILDINGS = [
  { id: "council", name: "Casa do Conselho", x: 352, y: -72, variant: 0 },
  { id: "forge", name: "Oficina de Toren", x: 544, y: -72, variant: 1 },
  { id: "inn", name: "Hospedaria da Travessia", x: 448, y: 176, variant: 2 },
  { id: "market", name: "Mercado da Travessia", x: 800, y: -96, variant: 0 },
  { id: "archive", name: "Arquivo dos Viajantes", x: 1040, y: -96, variant: 2 },
  { id: "clinic", name: "Posto dos Curandeiros", x: 1056, y: 304, variant: 0 },
  { id: "granary", name: "Armazém Comunitário", x: 944, y: 448, variant: 1 },
] as const;
export type Building = (typeof BUILDINGS)[number];
export const SIGNS = [
  { id: "entrance", name: "Placa da vila", x: 240, y: 64 },
  { id: "square", name: "Quadro de avisos", x: 448, y: 48 },
  { id: "market-sign", name: "Placa do mercado", x: 864, y: 48 },
  { id: "east-gate", name: "Aviso do portão leste", x: 1200, y: 304 },
] as const;
export const VILLAGE_RESPAWN = { x: 432, y: 48 } as const;
/** Define o terreno e a zona segura, sem proteger cavernas nem campos externos. */
export function villageGround(tx: number, ty: number): "grass" | "path" | null {
  if (tx < VILLAGE_BOUNDS.minX || tx > VILLAGE_BOUNDS.maxX ||
      ty < VILLAGE_BOUNDS.minY || ty > VILLAGE_BOUNDS.maxY) return null;
  const avenue = Math.abs(ty) <= 1 || (tx >= 13 && tx <= 14 && ty >= -10 && ty <= 15) ||
    (tx >= 27 && tx <= 28 && ty >= -10 && ty <= 15) ||
    (tx >= 21 && tx <= 22 && ty >= 9 && ty <= 16);
  const cross = (ty >= -8 && ty <= -7 && tx >= 9 && tx <= 34) ||
    (ty >= 10 && ty <= 11 && tx >= 13);
  return avenue || cross ? "path" : "grass";
}
/** Solo acessível fora da cidade, levando ao tutorial no tile 44,11. */
export function starterCaveTrail(tx: number, ty: number): boolean {
  return tx >= VILLAGE_BOUNDS.maxX + 1 && tx <= 46 && ty >= 10 && ty <= 12;
}
import { southCitySafe } from './southCity.ts';
/** Contrato único de zonas urbanas protegidas para todos os monstros da superfície. */
export function protectedSurfaceTile(tx:number,ty:number):boolean{
  return villageGround(tx,ty)!==null || southCitySafe(tx,ty);
}
/** Fachadas sólidas; portas ficam a 29px da origem, livres para interação. */
export function villageBlocks(x: number, y: number, r: number): boolean {
  return BUILDINGS.some(b => Math.abs(x - b.x) < 46 + r && y > b.y - 58 - r && y < b.y + 8 + r);
}
