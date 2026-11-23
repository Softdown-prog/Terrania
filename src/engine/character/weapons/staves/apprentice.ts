import type { StaffDefinition } from "../../Staves.ts";

/**
 * O Cajado de Aprendiz (ADR 0068): o primeiro do mago, como a espada de treino de carvalho é a primeira do cavaleiro. Haste de carvalho
 * com empunhadura de couro, três garras de madeira que seguram uma pedra azul-violeta que brilha de leve, e uma fita violeta atada
 * abaixo dela. Números propostos (o dono ajusta aqui): 8 de dano como a espada de treino, só que mais lento (1 s) e à distância (6 tiles),
 * com 5 de mana por magia (a barra de 50 dá dez magias e volta em 20 s).
 */
export const APPRENTICE_STAFF = {
  name: "Cajado de Aprendiz",
  level: 0,
  damage: 8,
  interval: 1,
  windup: 0.12,
  manaCost: 5,
  range: 6,
  element: null,
  visual: {
    motif: "oak",
    shaft: { light: "#b98b57", mid: "#8a6238", dark: "#53381f" },
    wrap: "#d8c7a4",
    wrapDark: "#8e7b57",
    ferrule: "#7d8794",
    ferruleLight: "#c3ccd6",
    collar: "#d9bf7c",
    collarDark: "#8f7430",
    sheen: "#f6ecd2",
    gem: { light: "#cbbcff", mid: "#8a6bff", dark: "#4a35b8", glow: "#9d86ff" },
    prongs: 3,
    ribbon: "#5b4fb0",
    ribbonDark: "#3d3685",
  },
} as const satisfies StaffDefinition;
