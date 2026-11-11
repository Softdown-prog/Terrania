import type { ElixirRecipe } from "./types.ts";

/** Cura mais de três vezes a poção comum; usa o que o cacto e a flor do deserto dão de sobra. */
export const GREATER_POTION: ElixirRecipe = {
  id: "greater-potion",
  name: "Poção Maior",
  description: "Recupera 120 HP imediatamente, sem passar da vida máxima.",
  ingredients: [
    { material: "Polpa de Cacto Hidratante", quantity: 2 },
    { material: "Flor do Deserto", quantity: 1 },
  ],
  price: 40,
  effect: { kind: "heal", amount: 120 },
};
