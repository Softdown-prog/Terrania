import type { BowDefinition } from "../../Bows.ts";

/**
 * O Arco Solar (ADR 0122, lote A4c): o oitavo do Arqueiro, no nível 70 como a lâmina de obsidiana. Latão polido com o brilho do sol nas curvas e a corda
 * de um feixe de luz dourada. Números propostos (o dono ajusta aqui): os da lâmina de obsidiana, 84 de dano e 1,25 s entre tiros, com 0,14 s de preparo;
 * alcance 7 tiles e uma flecha por tiro.
 */
export const SUN_BOW = {
  name: "Arco Solar",
  level: 70,
  damage: 84,
  interval: 1.25,
  windup: 0.14,
  range: 7,
  arrowsPerShot: 1,
  material: "latão e feixe de luz",
  visual: {
    limb: { light: "#fff0a8", mid: "#d9a63a", dark: "#7a5316" },
    string: "#fff6c8",
    wrap: "#b8741e",
    wrapDark: "#5a3a0c",
    tip: "#ffe27a",
    charm: "#ffd34a",
    length: 1.1,
    flick: 1,
  },
} as const satisfies BowDefinition;
