import type { GearBonusValues } from "../../engine/character/Equipment.ts";
import type { GearBonus } from "../../engine/character/gearBonus.ts";

/** Os bônus de uma peça em palavras, para a ficha dela no inventário (ADR 0079); vazio se a peça não dá bônus. */
export function describeGearBonus(bonus: GearBonusValues | undefined): string {
  const parts: string[] = [];
  if (bonus?.mana) parts.push(`mana máxima +${bonus.mana}%`);
  if (bonus?.regen) parts.push(`recarga de mana +${bonus.regen}%`);
  if (bonus?.damage) parts.push(`dano das magias +${bonus.damage}%`);
  return parts.join(" · ");
}

/** A soma dos bônus de tudo o que o Mago veste, numa linha curta para o cabeçalho do equipamento. */
export function describeGearTotals(total: GearBonus): string {
  return `Mana +${total.mana}% · Recarga +${total.regen}% · Dano +${total.damage}%`;
}
