import { criptaCoin } from "./cripta-coin.ts";
import { eclipseCrown } from "./eclipse-crown.ts";
import { terraniaGold } from "./terrania-gold.ts";
import type { CoinDefinition } from "./types.ts";

export type { CoinDefinition, CoinId } from "./types.ts";
export { MARKET_NPC, marketFor, materialSalePrice, type MarketId } from "./market.ts";
export { BOSS_CROWN_CHANCE, rollCoinDrop } from "./drops.ts";
export { coinBreakdown, describeCoins, MAX_COINS, MERGE_AT, normalizeCoins } from "./wallet.ts";

/** Da menor para a maior: cada moeda vale `MERGE_AT` da anterior. Cada uma vive no seu arquivo. */
export const COIN_TIERS: readonly CoinDefinition[] = [terraniaGold, criptaCoin, eclipseCrown];
