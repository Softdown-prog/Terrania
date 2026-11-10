import type { TowerInteriorStyle } from "./types.ts";

/** Torre do Vigia Caída por dentro: arenito claro, luz quente do deserto entrando pelas frestas. */
export const vigiaCaidaInterior: TowerInteriorStyle = {
  id: "vigia-caida",
  floor: { base: "#c7ab7a", light: "#e6d1a3", grout: "#7d6444" },
  brick: { light: "#d8bd8a", base: "#a8875a", dark: "#6b5236", mortar: "#8a7048" },
  glow: "#ffd28a",
  flame: "#ffb347",
  sconces: 0.16,
  windows: 0.5,
};
