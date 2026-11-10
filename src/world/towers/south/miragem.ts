import type { TowerDefinition } from "../types.ts";

/** Torre da Miragem: alta e esguia, com cúpula de vidro violeta. Três andares. */
export const torreDaMiragem = {
  id: "miragem",
  name: "Torre da Miragem",
  region: "south",
  floors: 3,
  weight: 3,
  blocks: [{ x: 0, y: -12, w: 48, h: 24 }],
  door: { x: 0, y: 12 },
} as const satisfies TowerDefinition;
