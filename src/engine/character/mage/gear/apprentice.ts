/**
 * O conjunto do Aprendiz (ADR 0078, lote A1 das roupas do Mago; lista em `docs/MAGO_ROUPAS.md`): as sete peças com que todo Mago nasce, no nível 1,
 * com o desenho que o Mago já tinha (chapéu pontudo, túnica azul-violeta). Só a túnica dá defesa (1); os bônus de mana e de dano dos conjuntos
 * seguintes entram no lote A2. Números propostos (o dono ajusta aqui). As peças são só do Mago (`heroClass`).
 */
export const APPRENTICE_GEAR = {
  "apprentice-hat": { slot: "head", name: "Chapéu de Aprendiz", defense: 0, heroClass: "mage", set: "Aprendiz" },
  "apprentice-robe": { slot: "chest", name: "Túnica de Aprendiz", defense: 1, heroClass: "mage", set: "Aprendiz" },
  "apprentice-trousers": { slot: "legs", name: "Calça de Aprendiz", defense: 0, heroClass: "mage", set: "Aprendiz" },
  "apprentice-boots": { slot: "feet", name: "Botas de Aprendiz", defense: 0, heroClass: "mage", set: "Aprendiz" },
  "apprentice-notebook": { slot: "shield", name: "Caderno de Feitiços", defense: 0, heroClass: "mage", set: "Aprendiz" },
  "brass-ring": { slot: "ring", name: "Anel de Latão", defense: 0, heroClass: "mage", set: "Aprendiz" },
  "dull-crystal-pendant": { slot: "neck", name: "Pingente de Cristal Baço", defense: 0, heroClass: "mage", set: "Aprendiz" },
} as const;
