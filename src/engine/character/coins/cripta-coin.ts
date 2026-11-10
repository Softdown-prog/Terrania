import type { CoinDefinition } from "./types.ts";

/** Cripta Coin: a moeda das criptas e masmorras, de brilho violeta. Vale 100 Terrania Gold; 100 viram 1 Eclipse Crown. */
export const criptaCoin = {
  id: "cripta-coin",
  name: "Cripta Coin",
  value: 100,
  description: "A moeda das criptas, cunhada com um arco de pedra. Vale 100 Terrania Gold; 100 delas se unem em 1 Eclipse Crown.",
} as const satisfies CoinDefinition;
