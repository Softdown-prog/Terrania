import type { WeaponDefinition } from "../../Weapons.ts";

/** Madeira de treino, cabo de linho e rastro contido. Perfil físico e ficha de combate autoritativos. */
export const STARTER_SWORD = {
  name: "Espada de Treino de Carvalho",
  level: 0,
  damage: 8,
  interval: 0.8,
  windup: 0.07,
  nature: "physical",
  special: null,
  trail: {
    first: "#8c7355",
    second: "#b69b6b",
    opacity: 0.4,
  },
  // Formato e materiais da arma, não ícones ou dependências do Canvas.
  visual: {
    motif: "oak",
    accent: "#c8a47c",
    trim: "#765134",
    blade: "#98734e",
    shade: "#584231",
    glint: "#c8a47c",
    guard: "#73604e",
    grip: "#9c8063",
    trailThickness: 2.4,
    width: 3.1,
    length: 31,
    wrapColor: "#ded1b7",
    trailLineWidth: 1,
  },
} as const satisfies WeaponDefinition;
