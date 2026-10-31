/** Inventário da aventura solo. Não faz parte do protocolo autoritativo online. */
export const MAX_STACK = 99;
export const QUEST_REWARD_POTIONS = 2;
export const POTION_HEAL = 35;

export interface InventoryState {
  gel: number;
  potion: number;
  questRewardClaimed: boolean;
}

const count = (value: unknown): number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? Math.min(MAX_STACK, value) : 0;

/** Nunca confiar em objetos serializados vindos do localStorage. */
export function normalizeInventory(value: unknown): InventoryState {
  if (!value || typeof value !== "object") {
    return { gel: 0, potion: 0, questRewardClaimed: false };
  }
  const state = value as Partial<InventoryState>;
  return {
    gel: count(state.gel),
    potion: count(state.potion),
    questRewardClaimed: state.questRewardClaimed === true,
  };
}

export class Inventory {
  private gelCount = 0;
  private potionCount = 0;
  private claimed = false;

  constructor(value?: unknown) {
    const state = normalizeInventory(value);
    this.gelCount = state.gel;
    this.potionCount = state.potion;
    this.claimed = state.questRewardClaimed;
  }

  get gel(): number { return this.gelCount; }
  get potion(): number { return this.potionCount; }
  get questRewardClaimed(): boolean { return this.claimed; }
  get hasRoomForGel(): boolean { return this.gelCount < MAX_STACK; }

  addGel(): boolean {
    if (!this.hasRoomForGel) return false;
    this.gelCount++;
    return true;
  }

  /** Recompensa única de Aela ao completar a missão de cinco slimes. */
  claimAelaReward(kills: number): boolean {
    if (!Number.isFinite(kills) || kills < 5 || this.claimed ||
        this.potionCount > MAX_STACK - QUEST_REWARD_POTIONS) return false;
    this.potionCount += QUEST_REWARD_POTIONS;
    this.claimed = true;
    return true;
  }

  usePotion(hero: { hp: number; maxHp: number }): boolean {
    if (this.potionCount < 1 || !Number.isFinite(hero.hp) ||
        !Number.isFinite(hero.maxHp) || hero.hp <= 0 || hero.hp >= hero.maxHp) return false;
    hero.hp = Math.min(hero.maxHp, hero.hp + POTION_HEAL);
    this.potionCount--;
    return true;
  }

  snapshot(): InventoryState {
    return {
      gel: this.gelCount,
      potion: this.potionCount,
      questRewardClaimed: this.claimed,
    };
  }
}
