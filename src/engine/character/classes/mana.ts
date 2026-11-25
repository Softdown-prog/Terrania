import type { HeroClassId } from "./heroClass.ts";
import { heroClassSheet } from "./catalog.ts";
import { NO_GEAR_BONUS, scaledMaxMana, type GearBonus } from "../gearBonus.ts";

/** Mana vinda do save: número finito de 0 ao máximo, com duas casas; qualquer outra coisa (ou sem mana) vale zero. */
export function normalizeMana(value: unknown, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || max <= 0) return 0;
  return Math.round(Math.min(max, value) * 100) / 100;
}

/**
 * A mana depois de `dt` segundos de jogo: só sobe, e nunca passa do máximo do nível. Com o bônus das roupas (ADR 0079) o máximo cresce `bonus.mana`%
 * e a mana volta mais depressa: a barra maior enche no mesmo tempo (o ritmo cresce com o máximo) e a recarga soma `bonus.regen`% de velocidade.
 */
export function regenerateMana(current: number, heroClass: HeroClassId, level: number, dt: number, bonus: GearBonus = NO_GEAR_BONUS): number {
  const sheet = heroClassSheet(heroClass), max = scaledMaxMana(sheet.maxMana(level), bonus);
  if (max <= 0 || !Number.isFinite(dt) || dt <= 0) return Math.min(current, max);
  return Math.min(max, current + sheet.manaPerSecond(level) * (1 + bonus.mana / 100) * (1 + bonus.regen / 100) * dt);
}
