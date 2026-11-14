import { CAPITAL, capitalLocal } from "./layout.ts";

/** Zona protegida: dentro da muralha, sem contar a própria muralha nem a boca dos portões (a lei da cidade vale lá dentro). */
export function capitalSafe(tx: number, ty: number): boolean {
  if (!Number.isSafeInteger(tx) || !Number.isSafeInteger(ty)) return false;
  const [lx, ly] = capitalLocal(tx, ty);
  return lx > CAPITAL.minX && lx < CAPITAL.maxX && ly > CAPITAL.minY && ly < CAPITAL.maxY;
}

/** A terra em volta: a cidade e a faixa de `CAPITAL.margin` tiles além da muralha (limpa de lago, mata, pedra e caverna). */
export function nearCapital(tx: number, ty: number): boolean {
  const [lx, ly] = capitalLocal(tx, ty);
  return lx >= CAPITAL.minX - CAPITAL.margin && lx <= CAPITAL.maxX + CAPITAL.margin &&
    ly >= CAPITAL.minY - CAPITAL.margin && ly <= CAPITAL.maxY + CAPITAL.margin;
}
