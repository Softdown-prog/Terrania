import type { WeaponDefinition } from "../../Weapons.ts";

/** Espada básica de ferro, sem magia, intermediária entre forja e bronze. */
export const COMMON_SWORD = {
  name: "Espada Comum de Ferro",
  level: 15,
  damage: 21,
  interval: 0.98,
  windup: 0.09,
  nature: "physical",
  special: null,
  trail: {
    first: "#c9cfd0",
    second: "#99a8ae",
    opacity: 0.78,
  },
  visual: {
    motif: "iron",
    accent: "#d8ddd7",
    trim: "#85928e",
    blade: "#aab9bc",
    shade: "#56696d",
    glint: "#edf0e7",
    guard: "#818c87",
    grip: "#74543e",
    wrapColor: "#a18462",
    width: 3.8,
    length: 36,
    trailThickness: 3.05,
    trailLineWidth: 1.15,
    guardReach: 2.7,
    pommelRadius: 2.1,
  },
} as const satisfies WeaponDefinition;
