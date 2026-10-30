/** Dados determinísticos da Vila da Travessia, usados também no backend. */
export const BUILDINGS = [
  { id: "council", name: "Casa do Conselho", x: 352, y: -72, variant: 0 },
  { id: "forge", name: "Oficina de Toren", x: 544, y: -72, variant: 1 },
  { id: "inn", name: "Hospedaria da Travessia", x: 448, y: 176, variant: 2 },
] as const;
export type Building = (typeof BUILDINGS)[number];
export const SIGNS = [
  { id: "entrance", name: "Placa da vila", x: 240, y: 64 },
  { id: "square", name: "Quadro de avisos", x: 448, y: 48 },
] as const;
export function villageGround(tx: number, ty: number): "grass" | "path" | null {
  if (tx < 6 || tx > 21 || ty < -7 || ty > 9) return null;
  return Math.abs(ty) <= 1 || (tx >= 13 && tx <= 14 && ty >= -4 && ty <= 6) ? "path" : "grass";
}
/** Casas sólidas: as portas, a 29 px da fachada, ficam fora da colisão. */
export function villageBlocks(x: number, y: number, r: number): boolean {
  return BUILDINGS.some(b => Math.abs(x - b.x) < 46 + r && y > b.y - 58 - r && y < b.y + 8 + r);
}
