/**
 * Resultados do preparo e do uso de elixires (ADR 0030); a interface traduz cada um em mensagem
 * (`INVENTORY_FEEDBACK`).
 */
export type ElixirCraftResult = "elixir-crafted" | "missing-ingredients" | "insufficient-elixir-coins" |
  "elixir-stack-full" | "too-far-from-lab";
export type ElixirUseResult = "elixir-used" | "no-elixir" | "elixir-no-effect";
