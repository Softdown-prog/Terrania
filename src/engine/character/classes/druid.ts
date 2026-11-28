import type { HeroClassSheet } from "./sheet.ts";

/**
 * O Druida (ADR 0124; plano em `docs/DRUIDA.md`): guardião da natureza, que prende, envenena e cura com mana, e luta com o **bordão** (decisão do dono, 2026-11-28).
 * Números propostos em `DRUIDA.md` (o dono ajusta aqui): a mana do Mago (50 no nível 1, mais 10 por nível, a barra enche em 20 s) e **90% da vida** do Cavaleiro
 * no mesmo nível (o Mago tem 80%). O bônus de recarga ao ar livre vem com o primeiro bordão. Ainda não é jogável: a tela de escolha o mostra como "Em breve"
 * até o bordão, o desenho, o inventário e as magias ficarem prontos.
 */
export const DRUID_BASE_MANA = 50;
export const DRUID_MANA_PER_LEVEL = 10;
export const DRUID_FULL_RECHARGE_SECONDS = 20;
export const DRUID_HP_PERCENT = 90;
const maxMana = (level: number): number => DRUID_BASE_MANA + (Math.max(1, Math.floor(level)) - 1) * DRUID_MANA_PER_LEVEL;
export const DRUID: HeroClassSheet = {
  id: "druid", name: "Druida", playable: false, weapon: "crook", usesSwords: false, wearsArmor: true,
  equipmentSlots: ["head", "neck", "ring", "chest", "weapon", "shield", "legs", "feet"],
  slotLabels: { head: "Cocar", neck: "Colar", ring: "Anel", chest: "Peitoral", weapon: "Bordão", shield: "Totem de mão", legs: "Calça", feet: "Botas" },
  hpPercent: DRUID_HP_PERCENT, speedPercent: 100, usesMana: true, maxMana,
  manaPerSecond: level => maxMana(level) / DRUID_FULL_RECHARGE_SECONDS,
};
