import type { StaffDefinition } from "../../Staves.ts";

/**
 * O Cajado do Espinheiro (ADR 0075, lote 2): de natureza, no nível 45 como a lâmina das dunas. Um galho vivo coberto de espinhos e folhas,
 * com uma gema verde-clara; a magia envenena o alvo (3 de dano por segundo, durante 4 s, e acumula até 3 vezes: com os três acúmulos são 9
 * por segundo). Libera sozinho no nível. Números propostos (o dono ajusta aqui): 52 de dano e 1,35 s entre magias (a lâmina das dunas mais
 * 0,2 s), preparo de 0,16 s e mana de 66 por magia.
 */
export const THORN_STAFF = {
  name: "Cajado do Espinheiro",
  level: 45,
  damage: 52,
  interval: 1.35,
  windup: 0.16,
  manaCost: 66,
  range: 6,
  element: "nature",
  effect: { kind: "poison", seconds: 4, damage: 3, maxStacks: 3 },
  visual: {
    motif: "thorn",
    shaft: { light: "#8fb164", mid: "#587f3c", dark: "#2c4a24" },
    wrap: "#7a5430",
    wrapDark: "#4a3018",
    ferrule: "#6b5a3a",
    ferruleLight: "#b5a070",
    collar: "#c8a548",
    collarDark: "#7c6420",
    sheen: "#e1f4c0",
    gem: { light: "#dcffb4", mid: "#72c23a", dark: "#2f6a16", glow: "#8fe05a" },
    prongs: 3,
    ribbon: "#c8508f",
    ribbonDark: "#7a2a58",
  },
} as const satisfies StaffDefinition;
