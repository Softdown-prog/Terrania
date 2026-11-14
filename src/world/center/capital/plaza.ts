import { capitalLocal } from "./layout.ts";
import { CAPITAL_STREETS } from "./streets.ts";

/** O retângulo da Praça dos Povos, em tiles locais (a rua `praca-dos-povos`). */
const PLAZA = CAPITAL_STREETS.find(s => s.id === "praca-dos-povos")!.rect;

/** O tile local (lx, ly) é da Praça dos Povos? */
export function isCapitalPlazaLocal(lx: number, ly: number): boolean {
  return lx >= PLAZA.x0 && lx <= PLAZA.x1 && ly >= PLAZA.y0 && ly <= PLAZA.y1;
}

/** O tile do mundo (tx, ty) é da Praça dos Povos? */
export function isCapitalPlaza(tx: number, ty: number): boolean {
  if (!Number.isSafeInteger(tx) || !Number.isSafeInteger(ty)) return false;
  const [lx, ly] = capitalLocal(tx, ty);
  return isCapitalPlazaLocal(lx, ly);
}
