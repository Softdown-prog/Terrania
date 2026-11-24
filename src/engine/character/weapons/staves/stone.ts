import type { StaffDefinition } from "../../Staves.ts";

/**
 * O Cajado de Rocha Viva (ADR 0073, lote 1): de terra, no nível 15 como a espada comum. Haste de pedra bruta riscada de veios, anel de
 * cobre e uma gema ocre cercada de lascas de rocha; a magia deixa o alvo 30% mais lento por 2 s. Libera sozinho no nível. Números
 * propostos (o dono ajusta aqui): 21 de dano e 1,18 s entre magias (a espada comum mais 0,2 s), mana de 22 por magia.
 */
export const STONE_STAFF = {
  name: "Cajado de Rocha Viva",
  level: 15,
  damage: 21,
  interval: 1.18,
  windup: 0.14,
  manaCost: 22,
  range: 6,
  element: "earth",
  effect: { kind: "slow", factor: 0.7, seconds: 2 },
  visual: {
    motif: "stone",
    shaft: { light: "#b9ab94", mid: "#8b7d69", dark: "#51463a" },
    wrap: "#7c5a3c",
    wrapDark: "#47301d",
    ferrule: "#6b6258",
    ferruleLight: "#b3a898",
    collar: "#c98d4f",
    collarDark: "#7a4e22",
    sheen: "#efe3cf",
    gem: { light: "#ffe3a1", mid: "#d99a2b", dark: "#7d4f10", glow: "#f0b84a" },
    prongs: 3,
    ribbon: "#a8742f",
    ribbonDark: "#6b4616",
  },
} as const satisfies StaffDefinition;
