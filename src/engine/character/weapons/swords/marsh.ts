import type { WeaponDefinition } from "../../Weapons.ts";

/** Cutelo serrilhado com gotejamento de veneno. Perfil físico e ficha de combate autoritativos. */
export const MARSH_SWORD = {
  name: "Cutelo Peçonhento do Charco",
  level: 80,
  damage: 98,
  interval: 1.3,
  windup: 0.14,
  nature: "hybrid",
  special: "poison",
  trail: {
    first: "#76ff03",
    second: "#6a1b9a",
    opacity: 1,
  },
  // Formato e materiais da arma, não ícones ou dependências do Canvas.
  visual: {
    motif: "venom",
    accent: "#b5ff66",
    trim: "#603b7d",
    blade: "#578b4b",
    shade: "#3b345e",
    glint: "#9aff65",
    guard: "#b3a59a",
    grip: "#78548c",
    trailThickness: 4.5,
    width: 5.7,
    length: 41,
    serrated: true,
    rune: true,
    runeColor: "#aaec58",
    ornament: "venom",
    trailAccent: "venom-drops",
  },
} as const satisfies WeaponDefinition;
