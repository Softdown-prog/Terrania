import type { StaffDefinition } from "../../Staves.ts";

/**
 * O Cajado das Marés (ADR 0073, lote 1): de água, no nível 20 como o gládio de bronze. Haste de coral rosado com ramos que seguram uma
 * pérola-gema azul; a magia cura o mago em 10% do dano que causa. Libera sozinho no nível. Números propostos (o dono ajusta aqui): 26 de
 * dano e 1,15 s entre magias (o gládio mais 0,2 s), mana de 28 por magia.
 */
export const TIDE_STAFF = {
  name: "Cajado das Marés",
  level: 20,
  damage: 26,
  interval: 1.15,
  windup: 0.14,
  manaCost: 28,
  range: 6,
  element: "water",
  effect: { kind: "heal", percent: 10 },
  visual: {
    motif: "coral",
    shaft: { light: "#ffb9a8", mid: "#e0776a", dark: "#8f3a35" },
    wrap: "#3a6f9c",
    wrapDark: "#1f4466",
    ferrule: "#5b7f9e",
    ferruleLight: "#bcd8ee",
    collar: "#e8e1c8",
    collarDark: "#8f8566",
    sheen: "#fff3ea",
    gem: { light: "#c9ecff", mid: "#3fa0ec", dark: "#17508f", glow: "#6cc4ff" },
    prongs: 3,
    ribbon: "#2f86c8",
    ribbonDark: "#1b5287",
  },
} as const satisfies StaffDefinition;
