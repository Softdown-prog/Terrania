import type { HeroClassSheet } from "./sheet.ts";

/**
 * O Mago (ADR 0065): cajado e magia à distância, que gasta mana. Números propostos (o dono ajusta aqui): 50 de mana no nível 1, mais 10
 * por nível; a barra enche inteira em 20 s de jogo, em qualquer nível.
 */
export const MAGE_BASE_MANA = 50;
export const MAGE_MANA_PER_LEVEL = 10;
export const MAGE_FULL_RECHARGE_SECONDS = 20;
/** Como ataca de longe, o Mago tem 80% da vida do Cavaleiro no mesmo nível (decisão do dono, ADR 0069). */
export const MAGE_HP_PERCENT = 80;
const maxMana = (level: number): number => MAGE_BASE_MANA + (Math.max(1, Math.floor(level)) - 1) * MAGE_MANA_PER_LEVEL;
export const MAGE: HeroClassSheet = {
  id: "mage", name: "Mago", playable: true, usesSwords: false, wearsArmor: true,
  equipmentSlots: ["head", "neck", "ring", "chest", "weapon", "shield", "legs", "feet"],
  slotLabels: { head: "Chapéu", neck: "Colar", ring: "Anel", chest: "Túnica", weapon: "Cajado", shield: "Livro de magias", legs: "Calça", feet: "Botas" },
  hpPercent: MAGE_HP_PERCENT, usesMana: true, maxMana,
  manaPerSecond: level => maxMana(level) / MAGE_FULL_RECHARGE_SECONDS,
};
