import type { BowDefinition } from "../../Bows.ts";

/**
 * O Arco de Espinheiro (ADR 0121, lote A4b): o sexto do Arqueiro, no nível 45 como a lâmina das dunas. Galhos vivos trançados, de casca verde-escura,
 * com espinhos e uma folha na borla. Números propostos (o dono ajusta aqui): os da lâmina das dunas, 52 de dano e 1,15 s entre tiros, com 0,13 s de
 * preparo; alcance 7 tiles e uma flecha por tiro.
 */
export const THORN_BOW = {
  name: "Arco de Espinheiro",
  level: 45,
  damage: 52,
  interval: 1.15,
  windup: 0.13,
  range: 7,
  arrowsPerShot: 1,
  material: "galhos vivos com espinhos",
  visual: {
    limb: { light: "#8fc46a", mid: "#4a7a34", dark: "#1f3a18" },
    string: "#d9e8b8",
    wrap: "#6b4a2a",
    wrapDark: "#35230f",
    tip: "#c8523a",
    charm: "#7acb52",
    length: 1.12,
    flick: 0.4,
  },
} as const satisfies BowDefinition;
