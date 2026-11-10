import { criptaCoin } from "./cripta-coin.ts";
import { eclipseCrown } from "./eclipse-crown.ts";
import { terraniaGold } from "./terrania-gold.ts";
import type { CoinId } from "./types.ts";

/**
 * Regras da carteira (ADR 0023). O dinheiro é UM número inteiro, em Terrania Gold. As moedas maiores
 * não são guardadas à parte: aparecem sozinhas quando o total passa de 100 (Cripta Coin) ou de
 * 10.000 (Eclipse Crown), e o troco volta sozinho ao pagar. Assim nunca há moeda "solta" a juntar.
 */
export const MERGE_AT = 100;
/** 9.999 Eclipse Crown, 99 Cripta Coin e 99 Terrania Gold: o teto da carteira. */
export const MAX_COINS = 99_999_999;

/** Número seguro vindo do save (ou de qualquer lugar): inteiro, finito, de 0 ao teto. */
export function normalizeCoins(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? Math.min(MAX_COINS, value) : 0;
}

/** Quantas moedas de cada tipo o total forma. Só a Eclipse Crown passa de 99, até 9.999. */
export function coinBreakdown(total: number): ReadonlyArray<{ readonly id: CoinId; readonly count: number }> {
  const coins = normalizeCoins(total);
  return [
    { id: terraniaGold.id, count: coins % MERGE_AT },
    { id: criptaCoin.id, count: Math.floor(coins / criptaCoin.value) % MERGE_AT },
    { id: eclipseCrown.id, count: Math.floor(coins / eclipseCrown.value) },
  ];
}
