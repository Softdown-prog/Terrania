import type { StaffDefinition } from "../../Staves.ts";

/**
 * O Cajado de Brasa Rubra (ADR 0075, lote 2): de fogo, no nível 30 como o montante de cobre. Haste de madeira carbonizada riscada de brasa,
 * anel de cobre rubro e uma gema laranja cercada de chamas; a magia queima o alvo (4 de dano por segundo durante 3 s). Libera sozinho no
 * nível. Números propostos (o dono ajusta aqui): 38 de dano e 1,55 s entre magias (o montante mais 0,2 s), preparo de 0,21 s e mana de 53
 * por magia (a barra do nível 30 dura uns 20 s atirando sem parar).
 */
export const EMBER_STAFF = {
  name: "Cajado de Brasa Rubra",
  level: 30,
  damage: 38,
  interval: 1.55,
  windup: 0.21,
  manaCost: 53,
  range: 6,
  element: "fire",
  effect: { kind: "burn", seconds: 3, damage: 4 },
  visual: {
    motif: "ember",
    shaft: { light: "#7a5442", mid: "#43302a", dark: "#1d1311" },
    wrap: "#9a3a1e",
    wrapDark: "#5a1f0e",
    ferrule: "#6a4a3a",
    ferruleLight: "#b88a6a",
    collar: "#d9742e",
    collarDark: "#7a3010",
    sheen: "#ffd9a8",
    gem: { light: "#ffe3a8", mid: "#ff7a1a", dark: "#a42a06", glow: "#ff9a3c" },
    prongs: 3,
    ribbon: "#dc4a1c",
    ribbonDark: "#8c2a0c",
  },
} as const satisfies StaffDefinition;
