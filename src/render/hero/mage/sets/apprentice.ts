import { MAGE_PAL as P } from "../palette.ts";
import type { MageSetTheme } from "./theme.ts";

/** O conjunto do Aprendiz (ADR 0078): azul-violeta e ouro, a estrela bordada. É a ficha de origem dos painters. */
export const APPRENTICE_THEME: MageSetTheme = {
  id: "apprentice",
  tunic: P.tunic, cloak: P.cloak, hat: P.hat, hatSheen: "#b4aef2",
  lining: P.lining, trim: P.gold, trimD: P.goldD, gem: P.gem, cuff: P.cuff,
  pants: P.pants, boots: "#2e2358", bootsLight: "#6f68c6",
  motif: "star",
  book: { cover: P.tunic, page: "#f1efe0", ribbon: "#b4435a" },
  ring: { bezel: "#e6c46a", band: { light: "#c9a24e", mid: "#c9a24e", dark: "#8a6a22" }, shine: "#f3d98a", gem: { light: "#d8f6ff", mid: "#6fb8e8", dark: "#2a5f9c" } },
  pendant: { stone: { light: "#c8d6e4", mid: "#8aa3b8", dark: "#4f6a85" } },
};
