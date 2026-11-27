import type { DungeonDefinition } from "../types.ts";

/**
 * Masmorra das Raízes (ADR 0094 e 0101): toda gruta verde do Centro, menos a de treinamento da Aela, tem cinco andares (ou três, na versão curta, que pula o Jardim dos Fungos e os Túneis Retorcidos).
 * Raízes Rasas, Galeria dos Cipós (aparece a Raiz-Viva), Jardim dos Fungos, Túneis Retorcidos (mais elites e mais gente) e, no fundo, o Coração da Gruta, com o Ent Ancião. Cada andar de
 * baixo tem mais encontros que o de cima, e o último guarda o chefe.
 */
export const masmorraDasRaizes = {
  id: "masmorra-das-raizes",
  name: "Masmorra das Raízes",
  region: "center",
  theme: "verdant",
  floors: [
    { name: "Raízes Rasas", encounters: 4,
      monsters: ["giant-rat", "cave-bat", "root-spider", "moss-slime", "root-beetle"] },
    { name: "Galeria dos Cipós", encounters: 5,
      monsters: ["vine-snake", "walking-mushroom", "root-spider", "root-beetle", "living-root"] },
    { name: "Jardim dos Fungos", encounters: 5,
      monsters: ["walking-mushroom", "moss-slime", "vine-snake", "cave-bat", "root-spider"] },
    { name: "Túneis Retorcidos", encounters: 6,
      monsters: ["root-beetle", "living-root", "vine-snake", "root-spider", "walking-mushroom", "giant-rat"] },
    { name: "Coração da Gruta", encounters: 5, boss: "elder-cave-ent",
      monsters: ["root-beetle", "vine-snake", "living-root", "walking-mushroom"] },
  ],
  shortVariant: [0, 1, 4],
} as const satisfies DungeonDefinition;
