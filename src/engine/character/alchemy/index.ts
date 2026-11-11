import { MAX_STACK } from "../../Limits.ts";
import { ANTIDOTE } from "./antidote.ts";
import { GREATER_POTION } from "./greater-potion.ts";
import type { ElixirId, ElixirRecipe } from "./types.ts";

export type { ElixirCraftResult, ElixirEffect, ElixirId, ElixirRecipe, ElixirUseResult, Ingredient } from "./types.ts";
export { ANTIDOTE, GREATER_POTION };

/** Quem prepara: o diabrete Ixtal, na Casa de Venenos do Poço Negro. */
export const ALCHEMIST_NPC = "south-ixtal";

export const ELIXIR_RECIPES: readonly ElixirRecipe[] = [GREATER_POTION, ANTIDOTE];
export const ELIXIR_IDS: readonly ElixirId[] = ELIXIR_RECIPES.map(recipe => recipe.id);

export const isElixirId = (value: unknown): value is ElixirId => ELIXIR_IDS.some(id => id === value);
export function elixirRecipe(id: ElixirId): ElixirRecipe {
  const recipe = ELIXIR_RECIPES.find(entry => entry.id === id);
  if (!recipe) throw new RangeError(`Elixir desconhecido: ${String(id)}`);
  return recipe;
}

export type ElixirCounts = Readonly<Record<ElixirId, number>>;
export const emptyElixirCounts = (): Record<ElixirId, number> => ({ "greater-potion": 0, antidote: 0 });

/** Nunca confiar no que vem do save: só ids conhecidos, inteiros positivos, no teto da pilha. */
export function normalizeElixirs(value: unknown): Record<ElixirId, number> {
  const out = emptyElixirCounts();
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  const raw = value as Record<string, unknown>;
  for (const id of ELIXIR_IDS) {
    const quantity = raw[id];
    if (typeof quantity === "number" && Number.isSafeInteger(quantity) && quantity > 0) out[id] = Math.min(MAX_STACK, quantity);
  }
  return out;
}
