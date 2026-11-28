import type { BowDefinition } from "../../Bows.ts";

/**
 * O Arco Boreal (ADR 0121, lote A4b): o sétimo do Arqueiro, no nível 60 como a espada de cristal boreal. Madeira branca de bétula-do-gelo, com a corda
 * de fio de gelo azulado e as pontas de cristal. Números propostos (o dono ajusta aqui): os da espada boreal, 68 de dano e 1,1 s entre tiros, com 0,13 s
 * de preparo; alcance 7 tiles e uma flecha por tiro.
 */
export const BOREAL_BOW = {
  name: "Arco Boreal",
  level: 60,
  damage: 68,
  interval: 1.1,
  windup: 0.13,
  range: 7,
  arrowsPerShot: 1,
  material: "madeira branca e cordas de gelo",
  visual: {
    limb: { light: "#f4fbff", mid: "#cfe3ee", dark: "#7a9bb0" },
    string: "#9fe0ff",
    wrap: "#4a7fa8",
    wrapDark: "#26475f",
    tip: "#bff1ff",
    charm: "#7fd0f5",
    length: 1.1,
    flick: 1.2,
  },
} as const satisfies BowDefinition;
