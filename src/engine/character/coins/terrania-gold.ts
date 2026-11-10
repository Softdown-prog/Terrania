import type { CoinDefinition } from "./types.ts";

/** Terrania Gold: a moeda de ouro de todo dia e a unidade básica. 100 delas viram 1 Cripta Coin. */
export const terraniaGold = {
  id: "terrania-gold",
  name: "Terrania Gold",
  value: 1,
  description: "A moeda de ouro de Terrania. Ao juntar 100, elas se unem em 1 Cripta Coin.",
} as const satisfies CoinDefinition;
