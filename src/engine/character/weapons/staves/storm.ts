import type { StaffDefinition } from "../../Staves.ts";

/**
 * O Cajado da Tempestade (ADR 0076, lote 3): de raio, no nível 90 como o sabre da tempestade. Haste de metal azulado com uma bobina de cobre e
 * dois pólos que soltam arcos até a gema azul elétrica; a magia é um raio que salta do alvo para até 2 monstros vizinhos, cada salto com 60%
 * do dano. Libera sozinho no nível. Números propostos (o dono ajusta aqui): 115 de dano e 1,35 s entre magias (o sabre mais 0,2 s), preparo de
 * 0,17 s, mana de 127 por magia, saltos de até 3 tiles.
 */
export const STORM_STAFF = {
  name: "Cajado da Tempestade",
  level: 90,
  damage: 115,
  interval: 1.35,
  windup: 0.17,
  manaCost: 127,
  range: 6,
  element: "lightning",
  effect: { kind: "chain", jumps: 2, percent: 60, radius: 96 },
  visual: {
    motif: "coil",
    shaft: { light: "#dfe8f5", mid: "#8b9db8", dark: "#46546b" },
    wrap: "#2f3b52",
    wrapDark: "#171e2c",
    ferrule: "#7d8da8",
    ferruleLight: "#e6eefb",
    collar: "#e3ecf9",
    collarDark: "#6a7b96",
    sheen: "#ffffff",
    gem: { light: "#d9ecff", mid: "#2f84ff", dark: "#0b3a9c", glow: "#6fb0ff" },
    prongs: 2,
    ribbon: "#3f78d6",
    ribbonDark: "#1a3d82",
  },
} as const satisfies StaffDefinition;
