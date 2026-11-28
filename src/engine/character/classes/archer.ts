import type { HeroClassSheet } from "./sheet.ts";

/**
 * O Arqueiro (ADR 0109): atirador sem mana, ágil e frágil. Números propostos em `docs/ARQUEIRO.md` (o dono ajusta aqui): 85% da vida do
 * Cavaleiro no mesmo nível e 10% mais rápido ao andar. Jogável desde a liberação (ADR 0119): arco, flechas, corpo, inventário e a Irmandade dos
 * Arqueiros estão prontos; os outros dez arcos, as habilidades e as roupas vêm depois.
 */
export const ARCHER_HP_PERCENT = 85;
export const ARCHER_SPEED_PERCENT = 110;
export const ARCHER: HeroClassSheet = {
  id: "archer", name: "Arqueiro", playable: true, weapon: "bow", usesSwords: false, wearsArmor: true,
  equipmentSlots: ["head", "neck", "ring", "chest", "weapon", "shield", "legs", "ammo", "feet"],
  slotLabels: { head: "Capuz", neck: "Colar", ring: "Anel", chest: "Gibão", weapon: "Arco", shield: "Luvas", legs: "Calça", ammo: "Flechas", feet: "Botas" },
  hpPercent: ARCHER_HP_PERCENT, speedPercent: ARCHER_SPEED_PERCENT, usesMana: false, maxMana: () => 0, manaPerSecond: () => 0,
};
