import type { DungeonDefinition } from "../types.ts";

/** Cripta das Dunas: as cavernas do deserto dos Ermos do Sul. Três andares, ou dois na versão curta. */
export const criptaDasDunas = {
  id: "cripta-das-dunas",
  name: "Cripta das Dunas",
  region: "south",
  theme: "desert",
  floors: [
    { name: "Galerias de Areia", encounters: 4,
      monsters: ["dune-rat", "horned-viper", "carrion-vulture", "cactus-sprout", "dune-scout"] },
    { name: "Túnel dos Contrabandistas", encounters: 5,
      monsters: ["sand-goblin", "desert-orc", "dune-scout", "mirage-imp"] },
    { name: "Câmara dos Ossos", encounters: 4, boss: "carrion-sandworm",
      monsters: ["clay-troll", "dune-scorpion", "solar-scarab", "desert-orc"] },
  ],
  shortVariant: [0, 2],
} as const satisfies DungeonDefinition;
