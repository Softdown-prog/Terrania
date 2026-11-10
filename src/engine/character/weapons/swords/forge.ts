import type { WeaponDefinition } from "../../Weapons.ts";

/** Ferro batido de perfil estreito e acabamento metálico. Perfil físico e ficha de combate autoritativos. */
export const FORGE_SWORD = {
  name: "Espada Curta de Ferro Batido",
  level: 10,
  damage: 16,
  interval: 1,
  windup: 0.09,
  nature: "physical",
  special: null,
  trail: {
    first: "#d9e2ec",
    second: "#9fb3c8",
    opacity: 0.9,
  },
  // Formato e materiais da arma, não ícones ou dependências do Canvas.
  visual: {
    motif: "iron",
    accent: "#f0f5f4",
    trim: "#697b86",
    blade: "#c4ced0",
    shade: "#66767b",
    glint: "#f0f5f4",
    guard: "#a8aaa7",
    grip: "#6d4f3d",
    trailThickness: 3,
    width: 3.7,
    length: 35,
  },
} as const satisfies WeaponDefinition;
