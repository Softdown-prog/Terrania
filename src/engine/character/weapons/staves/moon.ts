import type { StaffDefinition } from "../../Staves.ts";

/**
 * O Cajado da Lua Negra (ADR 0076, lote 3): de sombra, no nível 80 como o cutelo do charco. Haste de ébano com runas roxas e uma lua crescente
 * escura em volta da gema violeta; a magia devolve ao Mago 10% do dano causado em mana. Libera sozinho no nível. Números propostos (o dono
 * ajusta aqui): 98 de dano e 1,5 s entre magias (o cutelo mais 0,2 s), preparo de 0,19 s e mana de 126 por magia.
 */
export const MOON_STAFF = {
  name: "Cajado da Lua Negra",
  level: 80,
  damage: 98,
  interval: 1.5,
  windup: 0.19,
  manaCost: 126,
  range: 6,
  element: "shadow",
  effect: { kind: "leech", percent: 10 },
  visual: {
    motif: "moon",
    shaft: { light: "#7b6590", mid: "#3f3052", dark: "#150e20" },
    wrap: "#2c1f3d",
    wrapDark: "#120b1c",
    ferrule: "#5a4a70",
    ferruleLight: "#b9a6d4",
    collar: "#b79de0",
    collarDark: "#4a3668",
    sheen: "#efe6ff",
    gem: { light: "#e6d2ff", mid: "#8a46d6", dark: "#3d1678", glow: "#b377ff" },
    prongs: 2,
    ribbon: "#6b3fa6",
    ribbonDark: "#2e1650",
  },
} as const satisfies StaffDefinition;
