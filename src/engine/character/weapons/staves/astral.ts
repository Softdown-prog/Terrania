import type { StaffDefinition } from "../../Staves.ts";

/**
 * O Cajado Astral de Terrania (ADR 0077, lote 4): o último e mais forte, no nível 100 como a Espada Astral. Haste de marfim com constelações de ouro,
 * uma grande estrela de oito pontas atrás da gema perolada e pequenas estrelas que giram em órbita; a magia acerta o alvo e até 2 monstros vizinhos
 * dele, todos com o dano inteiro. Libera sozinho no nível. Números propostos (o dono ajusta aqui): 140 de dano e 1,6 s entre magias (a espada astral
 * mais 0,2 s), preparo de 0,21 s, mana de 166 por magia e vizinhos a até 3 tiles do alvo.
 */
export const ASTRAL_STAFF = {
  name: "Cajado Astral de Terrania",
  level: 100,
  damage: 140,
  interval: 1.6,
  windup: 0.21,
  manaCost: 166,
  range: 6,
  element: "astral",
  effect: { kind: "nova", neighbors: 2, radius: 96 },
  visual: {
    motif: "astral",
    shaft: { light: "#fffaf0", mid: "#e4d9c2", dark: "#8f7e5a" },
    wrap: "#2a2f6e",
    wrapDark: "#141847",
    ferrule: "#c9a64a",
    ferruleLight: "#fff0b3",
    collar: "#ffe9a0",
    collarDark: "#b88a1e",
    sheen: "#ffffff",
    gem: { light: "#fff3d0", mid: "#f1dfa4", dark: "#8a6418", glow: "#ffdf8a" },
    prongs: 3,
    ribbon: "#3a43a0",
    ribbonDark: "#1a1f66",
  },
} as const satisfies StaffDefinition;
