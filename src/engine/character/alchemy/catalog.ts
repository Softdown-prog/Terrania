import { ANTIDOTE } from "./recipes/antidote.ts";
import { GREATER_POTION } from "./recipes/greater-potion.ts";
import type { ElixirId, ElixirRecipe } from "./recipe.ts";

/** Todas as receitas, na ordem em que aparecem na tela da Casa de Venenos. */
export const ELIXIR_RECIPES: readonly ElixirRecipe[] = [GREATER_POTION, ANTIDOTE];
export const ELIXIR_IDS: readonly ElixirId[] = ELIXIR_RECIPES.map(recipe => recipe.id);

export const isElixirId = (value: unknown): value is ElixirId => ELIXIR_IDS.some(id => id === value);
export function elixirRecipe(id: ElixirId): ElixirRecipe {
  const recipe = ELIXIR_RECIPES.find(entry => entry.id === id);
  if (!recipe) throw new RangeError(`Elixir desconhecido: ${String(id)}`);
  return recipe;
}
