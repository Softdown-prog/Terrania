import type { BowDefinition } from "../../Bows.ts";

/**
 * O Arco Longo de Teixo (ADR 0120, lote A4a): o terceiro do Arqueiro, no nível 15 como a espada comum. Um arco alto, de teixo escuro com o miolo claro, mais
 * comprido que os outros (um quinto a mais) e de pontas retas. Números propostos (o dono ajusta aqui): os da espada comum, 21 de dano e 0,98 s entre
 * tiros, com 0,14 s de preparo (a corda é mais dura); alcance 7 tiles e uma flecha por tiro.
 */
export const YEW_BOW = {
  name: "Arco Longo de Teixo",
  level: 15,
  damage: 21,
  interval: 0.98,
  windup: 0.14,
  range: 7,
  arrowsPerShot: 1,
  material: "teixo",
  visual: {
    limb: { light: "#d9a86a", mid: "#8f4f2a", dark: "#3d2214" },
    string: "#f0ead6",
    wrap: "#2f3f2a",
    wrapDark: "#18221a",
    tip: "#c9b27a",
    charm: "#4f8f58",
    length: 1.2,
    flick: 0,
  },
} as const satisfies BowDefinition;
