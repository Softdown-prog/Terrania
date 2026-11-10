import type { TowerInteriorStyle } from "./types.ts";

/** Torre do Sol Negro por dentro: basalto escuro, braseiros de chama violeta e poucas frestas. */
export const solNegroInterior: TowerInteriorStyle = {
  id: "sol-negro",
  floor: { base: "#6d5f80", light: "#9b8bb2", grout: "#2a2038" },
  brick: { light: "#7d6a92", base: "#54446a", dark: "#2a2038", mortar: "#1f1830" },
  glow: "#a56cff",
  flame: "#c08cff",
  sconces: 0.34,
  windows: 0.25,
};
