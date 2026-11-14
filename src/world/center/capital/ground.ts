import { capitalLocal, insideCapital } from "./layout.ts";
import { isCapitalStreet } from "./streets.ts";

/**
 * Terreno de dentro da muralha (ADR 0055): rua (praça e portões incluídos) é caminho; o resto é grama, sem árvore, pedra nem
 * água. A muralha e os edifícios são desenhados e bloqueiam nas partes seguintes; fora da muralha o mundo segue o gerador de sempre.
 */
export function capitalGround(tx: number, ty: number): "path" | "grass" | null {
  if (!Number.isSafeInteger(tx) || !Number.isSafeInteger(ty)) return null;
  const [lx, ly] = capitalLocal(tx, ty);
  if (!insideCapital(lx, ly)) return null;
  return isCapitalStreet(lx, ly) ? "path" : "grass";
}
