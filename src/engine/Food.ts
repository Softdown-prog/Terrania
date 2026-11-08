/** Alimentação da vocação inicial (Cavaleiro), compartilhada entre solo e sala Node. */
export const FOODS = {
  apple: { name: "Maçã", healBudget: 8, gelPrice: 1 },
  bread: { name: "Pão", healBudget: 18, gelPrice: 2 },
  meat: { name: "Carne assada", healBudget: 30, gelPrice: 3 },
} as const;
export type FoodId = keyof typeof FOODS;
export const FOOD_IDS: readonly FoodId[] = ["apple", "bread", "meat"];
export type FoodCounts = Record<FoodId, number>;
export const MAX_NUTRITION = 60;
export const FOOD_HEAL_INTERVAL = 2;
export const FOOD_EAT_COOLDOWN = 5;
export type FoodUseResult = "ate" | "no-food" | "eat-cooldown" | "nutrition-full" | "unavailable";
export type FoodTradeResult = "food-traded" | "insufficient-gel" | "food-stack-full";
export interface NutritionState {
  readonly reserve: number;
  readonly elapsed: number;
  readonly cooldown: number;
}
export function emptyFoodCounts(): FoodCounts { return { apple: 0, bread: 0, meat: 0 }; }
export function normalizeFoodCounts(value: unknown): FoodCounts {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const count = (id: FoodId): number => typeof raw[id] === "number" &&
    Number.isSafeInteger(raw[id]) && (raw[id] as number) >= 0 ? Math.min(99, raw[id] as number) : 0;
  return { apple: count("apple"), bread: count("bread"), meat: count("meat") };
}
export function normalizeNutrition(value: unknown): NutritionState {
  const v = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const within = (input: unknown, max: number): number =>
    typeof input === "number" && Number.isFinite(input) ? Math.max(0, Math.min(max, input)) : 0;
  return {
    reserve: Math.floor(within(v.reserve, MAX_NUTRITION)),
    elapsed: within(v.elapsed, FOOD_HEAL_INTERVAL - 0.000001),
    cooldown: within(v.cooldown, FOOD_EAT_COOLDOWN),
  };
}
export function hasNutrition(state: NutritionState): boolean {
  return state.reserve > 0 || state.cooldown > 0;
}
