import type { TowerDefinition } from "../types.ts";

/** Torre do Sol Negro: três degraus de basalto e um disco dourado no alto. Três andares. */
export const torreDoSolNegro = {
  id: "sol-negro",
  name: "Torre do Sol Negro",
  region: "south",
  floors: 3,
  weight: 2,
  blocks: [{ x: 0, y: -16, w: 84, h: 32 }],
  door: { x: 0, y: 12 },
} as const satisfies TowerDefinition;
