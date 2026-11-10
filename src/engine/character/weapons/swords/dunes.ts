import type { WeaponDefinition } from "../../Weapons.ts";

/** Lâmina serrilhada e guarda desértica alongada. Perfil físico e ficha de combate autoritativos. */
export const DUNES_SWORD = {
  name: "Lâmina Serrilhada das Dunas",
  level: 45,
  damage: 52,
  interval: 1.15,
  windup: 0.11,
  nature: "physical",
  special: "bleed",
  trail: {
    first: "#e0b468",
    second: "#a67c37",
    opacity: 0.95,
  },
  // Formato e materiais da arma, não ícones ou dependências do Canvas.
  visual: {
    motif: "dunes",
    accent: "#fff0ae",
    trim: "#8c6731",
    blade: "#d3a25a",
    shade: "#83613e",
    glint: "#f2d780",
    guard: "#c6a66a",
    grip: "#86664b",
    width: 5.1,
    length: 40,
    serrated: true,
    guardReach: 5,
    trailAccent: "sand",
  },
} as const satisfies WeaponDefinition;
