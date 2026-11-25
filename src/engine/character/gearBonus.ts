import { GEAR, isGearId, type GearDefinition, type GearState } from "./Equipment.ts";

/**
 * Os bônus que as roupas do Mago dão (ADR 0079; lista em `docs/MAGO_ROUPAS.md`), em porcentagem inteira, somados pelo que está vestido: **mana
 * máxima**, **recarga de mana** (velocidade em que a mana volta) e **dano das magias**. Cada atributo tem teto de 100% no total.
 */
export interface GearBonus { readonly mana: number; readonly regen: number; readonly damage: number }
export const NO_GEAR_BONUS: GearBonus = { mana: 0, regen: 0, damage: 0 };
export const MAX_GEAR_BONUS_PERCENT = 100;

const part = (value: unknown): number => typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;

/** A soma dos bônus do que está vestido; peças sem bônus (e ids que não existem) não somam nada. */
export function gearBonus(gear: GearState): GearBonus {
  let mana = 0, regen = 0, damage = 0;
  for (const id of Object.values(gear)) {
    if (!isGearId(id)) continue;
    const bonus = (GEAR[id] as GearDefinition).bonus;
    mana += part(bonus?.mana); regen += part(bonus?.regen); damage += part(bonus?.damage);
  }
  const cap = (value: number): number => Math.min(MAX_GEAR_BONUS_PERCENT, value);
  return mana === 0 && regen === 0 && damage === 0 ? NO_GEAR_BONUS : { mana: cap(mana), regen: cap(regen), damage: cap(damage) };
}

/** A mana máxima com o bônus das roupas (inteira): o máximo do nível mais `bonus.mana`%. */
export function scaledMaxMana(base: number, bonus: GearBonus): number {
  return Math.round(base * (1 + bonus.mana / 100));
}
