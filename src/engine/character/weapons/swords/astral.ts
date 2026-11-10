import type { WeaponDefinition } from "../../Weapons.ts";

/** Espada celestial com constelações e aletas. Perfil físico e ficha de combate autoritativos. */
export const ASTRAL_SWORD = {
  name: "Espada Astral de Terrania",
  level: 100,
  damage: 140,
  interval: 1.4,
  windup: 0.16,
  nature: "hybrid",
  special: "astral",
  trail: {
    first: "#1a237e",
    second: "#ffd700",
    opacity: 1,
  },
  // Formato e materiais da arma, não ícones ou dependências do Canvas.
  visual: {
    blade: "#5878d1",
    shade: "#212d81",
    glint: "#b0d4ff",
    guard: "#e5bd63",
    grip: "#3c448f",
    width: 5.3,
    length: 44,
    broad: true,
    rune: true,
    pommelRing: true,
    guardReach: 7,
    wingedGuard: true,
    runeColor: "#ecca57",
    ornament: "stars",
    trailAccent: "stars",
  },
} as const satisfies WeaponDefinition;
