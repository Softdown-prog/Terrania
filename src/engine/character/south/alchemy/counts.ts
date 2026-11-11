import { MAX_STACK } from "../../../Limits.ts";
import { ELIXIR_IDS } from "./catalog.ts";
import type { ElixirId } from "./recipe.ts";

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
