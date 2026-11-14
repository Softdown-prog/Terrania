import { CAPITAL, insideCapital } from "./layout.ts";

/** Um retângulo de tiles locais, de (x0, y0) a (x1, y1), com as pontas incluídas. */
export interface Rect { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number }

/** As ruas da capital (ADR 0055), por nome, cada uma um retângulo de tiles locais. */
export const CAPITAL_STREETS: ReadonlyArray<{ readonly id: string; readonly name: string; readonly rect: Rect }> = [
  { id: "grande-avenida", name: "Grande Avenida", rect: { x0: -4, y0: -32, x1: 4, y1: 31 } },
  { id: "avenida-dos-povos", name: "Avenida dos Povos", rect: { x0: -38, y0: -2, x1: 37, y1: 2 } },
  { id: "praca-dos-povos", name: "Praça dos Povos", rect: { x0: -11, y0: -11, x1: 11, y1: 11 } },
  { id: "muralha-norte", name: "Rua das Muralhas (norte)", rect: { x0: -38, y0: -30, x1: 37, y1: -29 } },
  { id: "muralha-sul", name: "Rua das Muralhas (sul)", rect: { x0: -38, y0: 28, x1: 37, y1: 29 } },
  { id: "muralha-oeste", name: "Rua das Muralhas (oeste)", rect: { x0: -38, y0: -30, x1: -37, y1: 29 } },
  { id: "muralha-leste", name: "Rua das Muralhas (leste)", rect: { x0: 36, y0: -30, x1: 37, y1: 29 } },
  { id: "travessa-oeste", name: "Travessa dos Ferreiros", rect: { x0: -24, y0: -30, x1: -23, y1: 29 } },
  { id: "travessa-leste", name: "Travessa dos Mercadores", rect: { x0: 23, y0: -30, x1: 24, y1: 29 } },
  { id: "rua-da-cidadela", name: "Rua da Cidadela", rect: { x0: -37, y0: -17, x1: 36, y1: -16 } },
  { id: "rua-das-casas", name: "Rua das Casas", rect: { x0: -37, y0: 15, x1: 36, y1: 16 } },
];

const inRect = (r: Rect, lx: number, ly: number): boolean => lx >= r.x0 && lx <= r.x1 && ly >= r.y0 && ly <= r.y1;

/** O tile local é rua (inclusive a praça e a abertura dos portões)? */
export function isCapitalStreet(lx: number, ly: number): boolean {
  return insideCapital(lx, ly) && CAPITAL_STREETS.some(s => inRect(s.rect, lx, ly));
}

/** O tile local é parte da muralha e está fechado (a muralha menos a abertura dos portões)? */
export function isCapitalWall(lx: number, ly: number): boolean {
  if (!insideCapital(lx, ly)) return false;
  if (lx === CAPITAL.minX || lx === CAPITAL.maxX) return true;
  return (ly === CAPITAL.minY || ly === CAPITAL.maxY) && Math.abs(lx) > CAPITAL.gateHalf;
}
