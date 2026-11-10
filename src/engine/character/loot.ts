import { MAX_COINS } from "./coins/wallet.ts";

/** Gel no chão, deixado por um slime. */
export interface GelDrop {
  readonly id: string;
  readonly item: "gel";
  readonly x: number;
  readonly y: number;
}
/** Moedas no chão (ADR 0024): `amount` em Terrania Gold; quanto vale decide o desenho (ouro, cripta ou coroa). */
export interface CoinDrop {
  readonly id: string;
  readonly item: "coin";
  readonly x: number;
  readonly y: number;
  readonly amount: number;
}
/** Item no chão, identificado dentro da aventura solo. */
export type LootDrop = GelDrop | CoinDrop;

export const MAX_WORLD_DROPS = 80;
export const PICKUP_DISTANCE = 24;

export function normalizeDrops(value: unknown): LootDrop[] {
  if (!Array.isArray(value)) return [];
  const result: LootDrop[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const drop = item as Partial<LootDrop>;
    const coin = drop as Partial<CoinDrop>;
    if ((drop.item !== "gel" && drop.item !== "coin") || typeof drop.id !== "string" ||
        drop.id.length < 1 || drop.id.length > 80 || seen.has(drop.id) ||
        typeof drop.x !== "number" || !Number.isFinite(drop.x) ||
        typeof drop.y !== "number" || !Number.isFinite(drop.y) ||
        Math.abs(drop.x) > 1_000_000 || Math.abs(drop.y) > 1_000_000) continue;
    if (drop.item === "coin" && !(typeof coin.amount === "number" && Number.isSafeInteger(coin.amount) &&
        coin.amount >= 1 && coin.amount <= MAX_COINS)) continue;
    seen.add(drop.id);
    result.push(drop.item === "coin" ? { id: drop.id, item: "coin", x: drop.x, y: drop.y, amount: coin.amount! }
      : { id: drop.id, item: "gel", x: drop.x, y: drop.y });
    if (result.length >= MAX_WORLD_DROPS) break;
  }
  return result;
}
