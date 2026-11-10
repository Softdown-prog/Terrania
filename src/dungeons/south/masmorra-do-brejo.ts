import type { DungeonDefinition } from "../types.ts";

/** Masmorra do Brejo: as cavernas encharcadas do sudeste, que o bestiário classifica no Sul. Dois andares. */
export const masmorraDoBrejo = {
  id: "masmorra-do-brejo",
  name: "Masmorra do Brejo",
  region: "south",
  theme: "marsh",
  floors: [
    { name: "Lodaçal", encounters: 4, monsters: ["poison-scout-toad", "clay-troll"] },
    { name: "Covil da Hidra", encounters: 4, boss: "mire-hydra",
      monsters: ["rotten-marsh-ent", "poison-scout-toad"] },
  ],
} as const satisfies DungeonDefinition;
