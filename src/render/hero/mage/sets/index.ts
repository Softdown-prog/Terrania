import { BREEZE_GEAR } from "../../../../engine/character/mage/gear/breeze.ts";
import { APPRENTICE_GEAR } from "../../../../engine/character/mage/gear/apprentice.ts";
import { APPRENTICE_THEME } from "./apprentice.ts";
import { BREEZE_THEME } from "./breeze.ts";
import type { MageSetTheme } from "./theme.ts";

/** Os conjuntos de roupas do Mago, com a ficha de aparência de cada um (ADR 0080); cada lote novo acrescenta o seu aqui. */
export const MAGE_SETS: readonly { readonly theme: MageSetTheme; readonly pieces: readonly string[] }[] = [
  { theme: APPRENTICE_THEME, pieces: Object.keys(APPRENTICE_GEAR) },
  { theme: BREEZE_THEME, pieces: Object.keys(BREEZE_GEAR) },
];

/** A ficha de aparência da peça, ou `null` se o id não é de nenhuma peça do Mago (como as do Cavaleiro). */
export function themeOfPiece(id: string | undefined): MageSetTheme | null {
  if (id === undefined) return null;
  return MAGE_SETS.find(set => set.pieces.includes(id))?.theme ?? null;
}
export { APPRENTICE_THEME, BREEZE_THEME };
export type { MageSetTheme };
