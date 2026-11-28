import type { BowDefinition } from "../../Bows.ts";

/**
 * O Arco Estelar (ADR 0122, lote A4c): o último do Arqueiro, no nível 100 como a espada astral de Terrania. Uma liga de estrelas, azul-violeta com pontos
 * de luz, a corda dourada e as pontas brancas. Números propostos (o dono ajusta aqui): os da espada astral, 140 de dano e 1,4 s entre tiros, com 0,15 s de
 * preparo (a corda é a mais dura); alcance 7 tiles e uma flecha por tiro.
 */
export const ASTRAL_BOW = {
  name: "Arco Estelar",
  level: 100,
  damage: 140,
  interval: 1.4,
  windup: 0.15,
  range: 7,
  arrowsPerShot: 1,
  material: "liga de estrelas",
  visual: {
    limb: { light: "#fff0ff", mid: "#8a7be0", dark: "#2a2060" },
    string: "#ffe9a8",
    wrap: "#3b2f7a",
    wrapDark: "#1a1440",
    tip: "#ffffff",
    charm: "#ffd0f0",
    length: 1.15,
    flick: 1,
  },
} as const satisfies BowDefinition;
