import type { StaffDefinition } from "../../Staves.ts";

/**
 * O Cajado da Geada Boreal (ADR 0075, lote 2): de gelo, no nível 60 como a espada de cristal boreal. Haste de cristal azul-pálido, cheia de
 * facetas, com uma gema ciano rodeada de estilhaços de gelo; a magia deixa o alvo 40% mais lento por 3 s. Libera sozinho no nível. Números
 * propostos (o dono ajusta aqui): 68 de dano e 1,3 s entre magias (a espada boreal mais 0,2 s), preparo de 0,16 s e mana de 83 por magia.
 */
export const FROST_STAFF = {
  name: "Cajado da Geada Boreal",
  level: 60,
  damage: 68,
  interval: 1.3,
  windup: 0.16,
  manaCost: 83,
  range: 6,
  element: "ice",
  effect: { kind: "slow", factor: 0.6, seconds: 3 },
  visual: {
    motif: "crystal",
    shaft: { light: "#eafaff", mid: "#abd9ee", dark: "#5b8fb0" },
    wrap: "#3d5b7c",
    wrapDark: "#22364e",
    ferrule: "#8fb0c8",
    ferruleLight: "#e0f2fc",
    collar: "#e2f5ff",
    collarDark: "#7aa8c4",
    sheen: "#ffffff",
    gem: { light: "#e8fcff", mid: "#4fd0f0", dark: "#157ea8", glow: "#7be4ff" },
    prongs: 2,
    ribbon: "#7ab9e2",
    ribbonDark: "#3b6b98",
  },
} as const satisfies StaffDefinition;
