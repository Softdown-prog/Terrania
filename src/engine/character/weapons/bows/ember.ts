import type { BowDefinition } from "../../Bows.ts";

/**
 * O Arco de Brasa (ADR 0121, lote A4b): o quinto do Arqueiro, no nível 30 como o montante de cobre. Madeira queimada, preta por fora e riscada de brasa
 * por dentro, com a corda laranja e a empunhadura de couro chamuscado. Números propostos (o dono ajusta aqui): os do montante de cobre, 38 de dano e
 * 1,35 s entre tiros, com 0,14 s de preparo; alcance 7 tiles e uma flecha por tiro.
 */
export const EMBER_BOW = {
  name: "Arco de Brasa",
  level: 30,
  damage: 38,
  interval: 1.35,
  windup: 0.14,
  range: 7,
  arrowsPerShot: 1,
  material: "madeira queimada com brasas",
  visual: {
    limb: { light: "#ff9a3c", mid: "#5a2a1a", dark: "#1c0f0a" },
    string: "#ffb35c",
    wrap: "#4a2418",
    wrapDark: "#220f09",
    tip: "#ff7a2a",
    charm: "#ffcf5a",
    length: 1.08,
    flick: 0.6,
  },
} as const satisfies BowDefinition;
