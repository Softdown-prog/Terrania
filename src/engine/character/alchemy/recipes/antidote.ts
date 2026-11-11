import type { ElixirRecipe } from "../recipe.ts";

/** Tira todos os status (veneno, queimadura, gelo...) sem gastar uma noite na hospedaria. */
export const ANTIDOTE: ElixirRecipe = {
  id: "antidote",
  name: "Antídoto de Ixtal",
  description: "Limpa veneno, queimadura e os outros males, sem curar vida.",
  ingredients: [
    { material: "Erva do Pântano", quantity: 1 },
    { material: "Glândula de Veneno", quantity: 1 },
  ],
  price: 18,
  effect: { kind: "cleanse" },
};
