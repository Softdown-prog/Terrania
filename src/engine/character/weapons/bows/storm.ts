import type { BowDefinition } from "../../Bows.ts";

/**
 * O Arco da Tempestade (ADR 0122, lote A4c): o décimo do Arqueiro, no nível 90 como o sabre da tempestade. Cobre avermelhado de raio, com a corda que
 * faísca em amarelo e as pontas viradas como asas de um trovão. Números propostos (o dono ajusta aqui): os do sabre da tempestade, 115 de dano e 1,15 s
 * entre tiros, com 0,13 s de preparo; alcance 7 tiles e uma flecha por tiro.
 */
export const STORM_BOW = {
  name: "Arco da Tempestade",
  level: 90,
  damage: 115,
  interval: 1.15,
  windup: 0.13,
  range: 7,
  arrowsPerShot: 1,
  material: "cobre e corda que faísca",
  visual: {
    limb: { light: "#ffcf9a", mid: "#c8703a", dark: "#5a2c14" },
    string: "#fff27a",
    wrap: "#3a4a6a",
    wrapDark: "#1c2638",
    tip: "#fff27a",
    charm: "#7ad0ff",
    length: 1.1,
    flick: 1.4,
  },
} as const satisfies BowDefinition;
