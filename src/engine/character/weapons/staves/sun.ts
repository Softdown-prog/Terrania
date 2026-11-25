import type { StaffDefinition } from "../../Staves.ts";

/**
 * O Cajado do Sol Nascente (ADR 0076, lote 3): de luz, no nível 70 como a lâmina de obsidiana. Haste de ouro polido com um disco solar de raios
 * atrás da gema amarela; a magia é um feixe que atravessa o alvo e atinge também um monstro atrás dele, com o mesmo dano. Libera sozinho no nível.
 * Números propostos (o dono ajusta aqui): 84 de dano e 1,45 s entre magias (a obsidiana mais 0,2 s), preparo de 0,19 s e mana de 107 por magia.
 */
export const SUN_STAFF = {
  name: "Cajado do Sol Nascente",
  level: 70,
  damage: 84,
  interval: 1.45,
  windup: 0.19,
  manaCost: 107,
  range: 6,
  element: "light",
  effect: { kind: "pierce", extra: 1 },
  visual: {
    motif: "sun",
    shaft: { light: "#fff1b3", mid: "#dcab32", dark: "#8d5f14" },
    wrap: "#8a4f1e",
    wrapDark: "#4d2a10",
    ferrule: "#c99a3a",
    ferruleLight: "#ffe9a0",
    collar: "#ffe08a",
    collarDark: "#a8741c",
    sheen: "#fffbe6",
    gem: { light: "#fff6c2", mid: "#ffd23a", dark: "#c27a0a", glow: "#ffe680" },
    prongs: 3,
    ribbon: "#f2b94a",
    ribbonDark: "#a8681a",
  },
} as const satisfies StaffDefinition;
