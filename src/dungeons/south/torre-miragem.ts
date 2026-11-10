import type { DungeonDefinition } from "../types.ts";

/** Torre da Miragem: a torre de vidro roxo. Três andares; o chefe vive sob a cúpula. */
export const torreMiragem = {
  id: "torre-miragem",
  name: "Torre da Miragem",
  region: "south",
  theme: "desert",
  tower: "miragem",
  floors: [
    { name: "Salão dos Espelhos", encounters: 3,
      monsters: ["mirage-imp", "dune-scout", "cactus-sprout"] },
    { name: "Escadaria de Vidro", encounters: 4,
      monsters: ["mirage-imp", "oasis-elf", "sand-goblin", "horned-viper"] },
    { name: "Sob a Cúpula", encounters: 4, boss: "dune-scorpion",
      monsters: ["mirage-imp", "oasis-elf", "solar-scarab"] },
  ],
} as const satisfies DungeonDefinition;
