import type { WeaponDefinition } from "../../Weapons.ts";

/** Sabre curvo e inscrições da tempestade. Perfil físico e ficha de combate autoritativos. */
export const TEMPEST_SWORD = {
  name: "Sabre Abissal da Tempestade",
  level: 90,
  damage: 115,
  interval: 1.15,
  windup: 0.12,
  nature: "hybrid",
  special: "lightning",
  trail: {
    first: "#00b0ff",
    second: "#ffee58",
    opacity: 1,
  },
  // Formato e materiais da arma, não ícones ou dependências do Canvas.
  visual: {
    blade: "#668cd0",
    shade: "#263e72",
    glint: "#eff7ff",
    guard: "#d5ae5d",
    grip: "#244777",
    width: 4.4,
    length: 43,
    curved: true,
    rune: true,
    runeColor: "#e4fbff",
    ornament: "storm",
    trailAccent: "bolts",
  },
} as const satisfies WeaponDefinition;
