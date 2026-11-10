import type { WeaponDefinition } from "../../Weapons.ts";

/** Montante rubro de lâmina larga. Perfil físico e ficha de combate autoritativos. */
export const COPPER_SWORD = {
  name: "Montante de Cobre Rubro",
  level: 30,
  damage: 38,
  interval: 1.35,
  windup: 0.16,
  nature: "physical",
  special: "push",
  trail: {
    first: "#d96b27",
    second: "#8c3811",
    opacity: 0.95,
  },
  // Formato e materiais da arma, não ícones ou dependências do Canvas.
  visual: {
    blade: "#bb6744",
    shade: "#773a30",
    glint: "#f6ab73",
    guard: "#99543b",
    grip: "#5a4339",
    width: 5.6,
    length: 39,
    broad: true,
  },
} as const satisfies WeaponDefinition;
