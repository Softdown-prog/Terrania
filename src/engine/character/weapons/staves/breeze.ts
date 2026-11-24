import type { StaffDefinition } from "../../Staves.ts";

/**
 * O Cajado da Brisa (ADR 0073, lote 1): o primeiro elemental, de vento, no nível 10 como a espada de ferro de Toren. Haste de osso claro
 * com penas atadas, anel de prata e uma gema verde-água; a magia empurra o alvo para trás. É vendido na Academia Arcana por 30 Terrania Gold
 * (o preço da espada de ferro). Números propostos (o dono ajusta aqui): 16 de dano e 1,2 s entre magias (a espada de ferro mais 0,2 s),
 * e mana de 17 por magia (a barra do nível 10 dura uns 20 s atirando sem parar).
 */
export const BREEZE_STAFF = {
  name: "Cajado da Brisa",
  level: 10,
  damage: 16,
  interval: 1.2,
  windup: 0.14,
  manaCost: 17,
  range: 6,
  element: "wind",
  effect: { kind: "push", distance: 16 },
  price: 30,
  visual: {
    motif: "feather",
    shaft: { light: "#f1ead7", mid: "#d3c7aa", dark: "#8e8063" },
    wrap: "#9fd6cf",
    wrapDark: "#4f8f8a",
    ferrule: "#9aa7b5",
    ferruleLight: "#e3edf5",
    collar: "#d7e3ec",
    collarDark: "#7d8fa0",
    sheen: "#ffffff",
    gem: { light: "#d2fff2", mid: "#5fd6bf", dark: "#1f8f86", glow: "#7ee8d4" },
    prongs: 2,
    ribbon: "#4cc2b0",
    ribbonDark: "#2a8277",
  },
} as const satisfies StaffDefinition;
