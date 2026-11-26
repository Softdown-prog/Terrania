import type { MageSetTheme } from "../theme.ts";
import { BREEZE_ACCENT } from "./accent.ts";
import { BREEZE_HAT } from "./hat.ts";
import { BREEZE_ROBE } from "./robe.ts";
import { BREEZE_TROUSERS } from "./trousers.ts";
import { BREEZE_BOOTS } from "./boots.ts";
import { BREEZE_BOOK } from "./book.ts";
import { BREEZE_RING } from "./ring.ts";
import { BREEZE_NECKLACE } from "./necklace.ts";

/** O conjunto da Brisa (ADR 0080): azul-céu e branco com prata e verde-água, o redemoinho de vento e as penas. Cada peça tem a sua paleta no seu arquivo (regra do dono); este arquivo só as junta na ficha que os painters leem. */
export const BREEZE_THEME: MageSetTheme = {
  ...BREEZE_ACCENT,
  ...BREEZE_HAT,
  ...BREEZE_ROBE,
  ...BREEZE_TROUSERS,
  ...BREEZE_BOOTS,
  ...BREEZE_BOOK,
  ...BREEZE_RING,
  ...BREEZE_NECKLACE,
};
