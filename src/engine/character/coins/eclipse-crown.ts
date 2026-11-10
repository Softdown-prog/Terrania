import type { CoinDefinition } from "./types.ts";

/** Eclipse Crown: a moeda mais rara, negra com um anel dourado, como o Sol Negro. Vale 100 Cripta Coin. */
export const eclipseCrown = {
  id: "eclipse-crown",
  name: "Eclipse Crown",
  value: 10_000,
  description: "A moeda mais rara de Terrania, negra com um anel de ouro. Vale 100 Cripta Coin, ou 10.000 Terrania Gold.",
} as const satisfies CoinDefinition;
