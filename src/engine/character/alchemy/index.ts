/**
 * Alquimia da Casa de Venenos (ADR 0030). Só reexporta: cada assunto vive no seu arquivo
 * (receitas em `recipes/`, catálogo, contagens, resultados e o alquimista).
 */
export type { ElixirEffect, ElixirId, ElixirRecipe, Ingredient } from "./recipe.ts";
export type { ElixirCraftResult, ElixirUseResult } from "./results.ts";
export { ALCHEMIST_NPC } from "./alchemist.ts";
export { ELIXIR_IDS, ELIXIR_RECIPES, elixirRecipe, isElixirId } from "./catalog.ts";
export { emptyElixirCounts, normalizeElixirs, type ElixirCounts } from "./counts.ts";
export { ANTIDOTE } from "./recipes/antidote.ts";
export { GREATER_POTION } from "./recipes/greater-potion.ts";
