import type { DungeonDefinition } from "../types.ts";

/**
 * Masmorra das Raízes (ADR 0094): uma parte das cavernas do Centro (as outras seguem como a Gruta das Raízes comum, e a de treinamento da Aela nunca entra). Três andares,
 * ou dois na versão curta: as raízes rasas, a galeria dos cipós, onde mora a Raiz-Viva, e o coração da gruta, onde espera o Ent Ancião. Os andares de cima só têm gente
 * do Centro que já se conhece; a elite e o chefe ficam nos fundos.
 */
export const masmorraDasRaizes = {
  id: "masmorra-das-raizes",
  name: "Masmorra das Raízes",
  region: "center",
  theme: "verdant",
  share: .4,
  floors: [
    { name: "Raízes Rasas", encounters: 4,
      monsters: ["giant-rat", "cave-bat", "root-spider", "moss-slime", "root-beetle"] },
    { name: "Galeria dos Cipós", encounters: 5,
      monsters: ["vine-snake", "walking-mushroom", "root-spider", "root-beetle", "living-root"] },
    { name: "Coração da Gruta", encounters: 4, boss: "elder-cave-ent",
      monsters: ["root-beetle", "vine-snake", "living-root", "walking-mushroom"] },
  ],
  shortVariant: [0, 2],
} as const satisfies DungeonDefinition;
