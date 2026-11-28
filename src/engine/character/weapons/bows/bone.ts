import type { BowDefinition } from "../../Bows.ts";

/**
 * O Arco de Osso (ADR 0120, lote A4a): o quarto do Arqueiro, no nível 20 como a espada de bronze. Costelas e ossos longos polidos, amarrados com tendão
 * claro, e a corda de nervo; as pontas rematadas em dentes. Números propostos (o dono ajusta aqui): os da espada de bronze, 26 de dano e 0,95 s entre tiros,
 * com 0,12 s de preparo; alcance 7 tiles e uma flecha por tiro.
 */
export const BONE_BOW = {
  name: "Arco de Osso",
  level: 20,
  damage: 26,
  interval: 0.95,
  windup: 0.12,
  range: 7,
  arrowsPerShot: 1,
  material: "osso polido",
  visual: {
    limb: { light: "#fbf6e6", mid: "#d9cfae", dark: "#8a7e5c" },
    string: "#d8c9a0",
    wrap: "#b89a62",
    wrapDark: "#6e5a32",
    tip: "#fffdf2",
    charm: "#7a2f26",
    length: 1.06,
    flick: 0.8,
  },
} as const satisfies BowDefinition;
