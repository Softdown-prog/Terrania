import type { DungeonDefinition } from "../types.ts";

/** Torre do Vigia Caída: a guarita do deserto. Dois andares; o chefe espera no topo quebrado. */
export const torreVigiaCaida = {
  id: "torre-vigia-caida",
  name: "Torre do Vigia Caída",
  region: "south",
  theme: "desert",
  tower: "vigia-caida",
  floors: [
    { name: "Guarita dos Vigias", encounters: 3,
      monsters: ["dune-rat", "horned-viper", "carrion-vulture", "dune-scout"] },
    { name: "Topo Quebrado", encounters: 3, boss: "clay-troll",
      monsters: ["sand-goblin", "desert-orc", "dune-scout"] },
  ],
} as const satisfies DungeonDefinition;
