import { CREATURE_CATALOG } from "../../../actors/CreatureCatalog.ts";
import { SOUTH_RARE_LOOT, southRareLootByName } from "../../../monsters/rareLoot.ts";

/**
 * O que o Poço Negro compra e por quanto (ADR 0026). Dois compradores, cada um com a sua banca:
 * o **Bazar das Raridades** (Zinha Dedos-de-Cobre) compra os dez loots raros do Sul e o **Ossuário**
 * (Coletor Marn) compra o saque comum das criaturas. Preços em Terrania Gold, deduzidos da chance
 * de queda: quanto mais raro, mais vale. Só vende o que a criatura realmente deixa.
 */
export type MarketId = "bazaar" | "ossuary";
export const MARKET_NPC: Readonly<Record<MarketId, string>> = { bazaar: "south-zinha", ossuary: "south-marn" };

const RARE_NAMES: ReadonlySet<string> = new Set(Object.values(SOUTH_RARE_LOOT).map(rare => rare.name));

/** O raro vale ~ 4 ÷ chance, em passos de 5: o Dente Dourado (3,5%) paga 115, a Pérola do Verme (1,2%) paga 335. */
function rarePrice(chance: number): number { return Math.round(4 / chance / 5) * 5; }

/** O saque comum vale ~ 0,6 ÷ chance, no mínimo 1: o que cai quase sempre paga pouco. */
function commonPrice(chance: number): number { return Math.max(1, Math.round(.6 / chance)); }

/** Qual banca compra este material, ou nada (por exemplo, o saque de montarias não é comprado). */
export function marketFor(material: string): MarketId | null {
  if (RARE_NAMES.has(material)) return "bazaar";
  return lowestChance(material) === null ? null : "ossuary";
}

function lowestChance(material: string): number | null {
  let chance: number | null = null;
  for (const creature of Object.values(CREATURE_CATALOG))
    for (const entry of creature.loot) if (entry.item === material && (chance === null || entry.chance < chance)) chance = entry.chance;
  return chance;
}

/** Quanto a banca paga por uma unidade, em Terrania Gold, ou nada se ninguém a compra. */
export function materialSalePrice(material: string): number | null {
  const rare = southRareLootByName(material);
  if (rare) return rarePrice(rare.chance);
  const chance = lowestChance(material);
  return chance === null ? null : commonPrice(chance);
}
