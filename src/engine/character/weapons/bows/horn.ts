import type { BowDefinition } from "../../Bows.ts";

/**
 * O Arco de Chifre (ADR 0120, lote A4a): o segundo do Arqueiro, no nível 10 como a espada de ferro de Toren. Dois chifres de bode curvados e polidos,
 * com as pontas viradas para fora (a madeira "dá o coice" no fim) e a empunhadura de couro vermelho-escuro. Números propostos (o dono ajusta aqui): os
 * da espada de ferro, 16 de dano e 1 s entre tiros, com 0,13 s de preparo; alcance 7 tiles e uma flecha por tiro como o Arco de Caça.
 */
export const HORN_BOW = {
  name: "Arco de Chifre",
  level: 10,
  damage: 16,
  interval: 1,
  windup: 0.13,
  range: 7,
  arrowsPerShot: 1,
  material: "chifre curvo",
  visual: {
    limb: { light: "#f0e2bd", mid: "#b98f55", dark: "#5e4020" },
    string: "#e8dec4",
    wrap: "#7a2f26",
    wrapDark: "#431812",
    tip: "#f4ecd2",
    charm: "#d6a24a",
    length: 1,
    flick: 1.6,
  },
} as const satisfies BowDefinition;
