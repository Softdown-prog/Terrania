import type { DungeonDefinition } from "../types.ts";

/** Torre do Sol Negro: a torre rara de basalto. Três andares e um chefe à altura. */
export const torreSolNegro = {
  id: "torre-sol-negro",
  name: "Torre do Sol Negro",
  region: "south",
  theme: "desert",
  tower: "sol-negro",
  floors: [
    { name: "Átrio de Basalto", encounters: 4,
      monsters: ["desert-orc", "sand-goblin", "dune-scorpion", "carrion-vulture"] },
    { name: "Galeria dos Braseiros", encounters: 5,
      monsters: ["desert-orc", "clay-troll", "mirage-imp", "solar-scarab"] },
    { name: "Câmara do Disco Negro", encounters: 5, boss: "carrion-sandworm",
      monsters: ["clay-troll", "dune-scorpion", "solar-scarab", "desert-orc"] },
  ],
} as const satisfies DungeonDefinition;
