import { CREATURE_CATALOG, type CreatureKind } from "../../../actors/CreatureCatalog.ts";
import { hash2 } from "../../../world/random.ts";
import { MAX_COINS } from "./wallet.ts";

/**
 * Quanto dinheiro uma criatura deixa ao cair (ADR 0024), em Terrania Gold. Determinístico pelo id da
 * criatura: o mesmo monstro derrotado deixa sempre a mesma quantia, em qualquer tela. Pela
 * experiência da espécie: a criatura fraca deixa pouco, a forte deixa muito. Os chefes das
 * masmorras deixam um baú (várias Cripta Coin) e, raramente, uma Eclipse Crown inteira.
 */
export const BOSS_CROWN_CHANCE = 0.03;
const idSalt = (id: string): number => [...id].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);

export function rollCoinDrop(kind: CreatureKind, id: string, options: { readonly boss?: boolean } = {}): number {
  const experience = CREATURE_CATALOG[kind].experience;
  const salt = idSalt(id);
  let amount = Math.max(1, Math.round(experience * (0.25 + 0.5 * hash2(salt, 7, 4421))));
  if (options.boss) {
    amount += Math.round(experience * (4 + 2 * hash2(salt, 8, 4423)));
    if (hash2(salt, 9, 4427) < BOSS_CROWN_CHANCE) amount += 10_000;
  }
  return Math.min(MAX_COINS, amount);
}
