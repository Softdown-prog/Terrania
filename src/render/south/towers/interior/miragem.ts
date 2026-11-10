import type { TowerInteriorStyle } from "./types.ts";

/** Torre da Miragem por dentro: pedra pálida, tijolo arroxeado e a luz violeta do vidro da cúpula. */
export const miragemInterior: TowerInteriorStyle = {
  id: "miragem",
  floor: { base: "#c9bdd6", light: "#ece3f3", grout: "#6f5f86" },
  brick: { light: "#a995c4", base: "#7a6699", dark: "#473a63", mortar: "#5d4d7a" },
  glow: "#c9a2ff",
  flame: "#b985ff",
  sconces: 0.22,
  windows: 0.7,
};
