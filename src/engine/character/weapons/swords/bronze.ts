import type { WeaponDefinition } from "../../Weapons.ts";

/** Bronze temperado, pomo largo e anel dourado. Perfil físico e ficha de combate autoritativos. */
export const BRONZE_SWORD = {
  name: "Gládio de Bronze Temperado",
  level: 20,
  damage: 26,
  interval: 0.95,
  windup: 0.09,
  nature: "physical",
  special: null,
  trail: {
    first: "#fff3c4",
    second: "#e6b800",
    opacity: 0.9,
  },
  // Formato e materiais da arma, não ícones ou dependências do Canvas.
  visual: {
    motif: "bronze",
    accent: "#f7d4a6",
    trim: "#c18d47",
    blade: "#c99a69",
    shade: "#886448",
    glint: "#f7d4a6",
    guard: "#d6ac59",
    grip: "#a28a6d",
    width: 4,
    length: 35,
    pommelRadius: 2.8,
    pommelRing: true,
  },
} as const satisfies WeaponDefinition;
