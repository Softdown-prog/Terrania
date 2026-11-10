import type { WeaponDefinition } from "../../Weapons.ts";

/** Obsidiana escura com fissura incandescente. Perfil físico e ficha de combate autoritativos. */
export const OBSIDIAN_SWORD = {
  name: "Lâmina Vulcânica de Obsidiana",
  level: 70,
  damage: 84,
  interval: 1.25,
  windup: 0.14,
  nature: "hybrid",
  special: "fire",
  trail: {
    first: "#ff5500",
    second: "#ffcc00",
    opacity: 1,
  },
  // Formato e materiais da arma, não ícones ou dependências do Canvas.
  visual: {
    blade: "#34333f",
    shade: "#171925",
    glint: "#ff772b",
    guard: "#5c3c38",
    grip: "#51413f",
    width: 6.3,
    length: 42,
    broad: true,
    rune: true,
    wingedGuard: true,
    wingColor: "#573f43",
    runeColor: "#ed642e",
    ornament: "magma",
    trailAccent: "particles",
  },
} as const satisfies WeaponDefinition;
