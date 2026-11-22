import type { HeroClassId } from "./heroClass.ts";
import { heroClassSheet } from "./catalog.ts";

/** Mana vinda do save: número finito de 0 ao máximo, com duas casas; qualquer outra coisa (ou sem mana) vale zero. */
export function normalizeMana(value: unknown, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || max <= 0) return 0;
  return Math.round(Math.min(max, value) * 100) / 100;
}

/** A mana depois de `dt` segundos de jogo: só sobe, e nunca passa do máximo do nível. */
export function regenerateMana(current: number, heroClass: HeroClassId, level: number, dt: number): number {
  const sheet = heroClassSheet(heroClass), max = sheet.maxMana(level);
  if (max <= 0 || !Number.isFinite(dt) || dt <= 0) return Math.min(current, max);
  return Math.min(max, current + sheet.manaPerSecond(level) * dt);
}
