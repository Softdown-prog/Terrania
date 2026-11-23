/**
 * As cores do herói Mago (ADR 0067): a mistura pedida pelo dono das três ideias: a **túnica azul-violeta** (a cor da Academia Arcana), o
 * **manto escuro e sombrio** azul-noite com prata, e o **chapéu pontudo** de feiticeiro. Cada peça tem rampa de três tons.
 */
export const MAGE_PAL = {
  tunic: { light: "#7a7fd6", mid: "#4b4fa0", dark: "#2c2d6b" },
  cloak: { light: "#3a437a", mid: "#2b3260", dark: "#10142c" },
  hat: { light: "#6e66c8", mid: "#3d3685", dark: "#221e55" },
  lining: "#5b4fb0",
  silver: "#cfd8ea", silverD: "#8d97b3",
  gold: "#e0c277", goldD: "#a8863e",
  gem: "#9fe3ff",
  /** O brilho branco-azulado das estrelinhas e do fecho. */
  spark: "#f4f8ff",
  outline: "#0e1030",
  /** Antebraço, um tom mais escuro que a manga, para a mão não parecer luva. */
  cuff: "#3a3c8a",
  pants: "#241f4a",
} as const;
