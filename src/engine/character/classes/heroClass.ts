/** As vocações do herói (ADR 0065). O Cavaleiro é a de sempre; o Mago é a nova; o Arqueiro entrou bloqueado (ADR 0109) e foi liberado (ADR 0119); o Druida entra bloqueado (ADR 0124). Escolhe-se ao criar um mundo novo; saves antigos são Cavaleiro. */
export const HERO_CLASS_IDS = ["knight", "mage", "archer", "druid"] as const;
export type HeroClassId = typeof HERO_CLASS_IDS[number];
export const DEFAULT_HERO_CLASS: HeroClassId = "knight";

/** Vocação vinda do save (ou de qualquer lugar): só vale uma das conhecidas; o resto volta ao Cavaleiro. */
export function normalizeHeroClass(value: unknown): HeroClassId {
  return HERO_CLASS_IDS.find(id => id === value) ?? DEFAULT_HERO_CLASS;
}
