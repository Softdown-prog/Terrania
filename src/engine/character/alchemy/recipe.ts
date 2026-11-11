/**
 * Alquimia da Casa de Venenos (ADR 0030). Cada receita vive em arquivo próprio; `index.ts` só reúne.
 * Ingredientes são materiais já existentes (saque das criaturas, por nome); o preparo custa moedas
 * em Terrania Gold, como o resto da economia (ADR 0025).
 */
export type ElixirId = "greater-potion" | "antidote";

/** O que o elixir faz quando o herói o usa. Só dados: a regra que aplica está em `Inventory.useElixir`. */
export type ElixirEffect =
  | { readonly kind: "heal"; readonly amount: number }
  | { readonly kind: "cleanse" };

export interface Ingredient {
  /** Nome exato do material, como aparece na bolsa. */
  readonly material: string;
  readonly quantity: number;
}

export interface ElixirRecipe {
  readonly id: ElixirId;
  readonly name: string;
  readonly description: string;
  readonly ingredients: readonly Ingredient[];
  /** Preço do preparo em Terrania Gold. */
  readonly price: number;
  readonly effect: ElixirEffect;
}
