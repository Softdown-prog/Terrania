import type { BowDefinition } from "../../Bows.ts";

/**
 * O Arco de Caça (ADR 0110): o primeiro do Arqueiro, como o Cajado de Aprendiz é o do Mago e a espada de treino é a do Cavaleiro. Madeira de freixo,
 * corda de tripa. Números propostos (o dono ajusta aqui): 8 de dano e 0,8 s entre tiros como a espada de treino, só que à distância (7 tiles) e com
 * 0,12 s de preparo até a flecha sair (a corda precisa ser puxada). Cada tiro gasta uma flecha.
 */
export const HUNTING_BOW = {
  name: "Arco de Caça",
  level: 0,
  damage: 8,
  interval: 0.8,
  windup: 0.12,
  range: 7,
  arrowsPerShot: 1,
  material: "madeira de freixo",
  visual: {
    limb: { light: "#e0c88f", mid: "#b08a55", dark: "#6e5030" },
    string: "#efe9d4",
    wrap: "#7a5530",
    wrapDark: "#4a3220",
    tip: "#d6c9a4",
    charm: "#a8482a",
  },
} as const satisfies BowDefinition;
