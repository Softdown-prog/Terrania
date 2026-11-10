import type { WeaponDefinition } from "../../Weapons.ts";

/** Cristal boreal com aletas e runas frias. Perfil físico e ficha de combate autoritativos. */
export const BOREAL_SWORD = {
  name: "Espada de Cristal Boreal",
  level: 60,
  damage: 68,
  interval: 1.1,
  windup: 0.11,
  nature: "hybrid",
  special: "ice",
  trail: {
    first: "#80e5ff",
    second: "#ffffff",
    opacity: 1,
  },
  // Formato e materiais da arma, não ícones ou dependências do Canvas.
  visual: {
    motif: "frost",
    accent: "#ecffff",
    trim: "#54cfff",
    blade: "#90dfff",
    shade: "#4b9ec7",
    glint: "#ebffff",
    guard: "#b3e8ff",
    grip: "#547f9b",
    trailThickness: 4.4,
    width: 5.5,
    length: 40,
    broad: true,
    rune: true,
    wingedGuard: true,
    runeColor: "#e4fbff",
    trailAccent: "ice-shards",
  },
} as const satisfies WeaponDefinition;
