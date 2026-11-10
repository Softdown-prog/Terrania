import type { TowerDefinition } from "../types.ts";

/** Torre do Vigia Caída: guarita de pedra do deserto, com o topo quebrado. Dois andares. */
export const torreDoVigiaCaida = {
  id: "vigia-caida",
  name: "Torre do Vigia Caída",
  region: "south",
  floors: 2,
  weight: 5,
  blocks: [{ x: 0, y: -14, w: 62, h: 28 }],
  door: { x: 0, y: 12 },
} as const satisfies TowerDefinition;
