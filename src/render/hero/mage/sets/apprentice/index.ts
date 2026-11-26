import type { MageSetTheme } from "../theme.ts";
import { APPRENTICE_ACCENT } from "./accent.ts";
import { APPRENTICE_HAT } from "./hat.ts";
import { APPRENTICE_ROBE } from "./robe.ts";
import { APPRENTICE_TROUSERS } from "./trousers.ts";
import { APPRENTICE_BOOTS } from "./boots.ts";
import { APPRENTICE_BOOK } from "./book.ts";
import { APPRENTICE_RING } from "./ring.ts";
import { APPRENTICE_NECKLACE } from "./necklace.ts";

/** O conjunto do Aprendiz (ADR 0078): azul-violeta e ouro, a estrela bordada. É a ficha de origem dos painters. Cada peça tem a sua paleta no seu arquivo (regra do dono); este arquivo só as junta na ficha que os painters leem. */
export const APPRENTICE_THEME: MageSetTheme = {
  ...APPRENTICE_ACCENT,
  ...APPRENTICE_HAT,
  ...APPRENTICE_ROBE,
  ...APPRENTICE_TROUSERS,
  ...APPRENTICE_BOOTS,
  ...APPRENTICE_BOOK,
  ...APPRENTICE_RING,
  ...APPRENTICE_NECKLACE,
};
