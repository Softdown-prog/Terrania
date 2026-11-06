import { aelaQuestProgress } from "../world/aelaQuest.ts";
import { nearestNpc } from "../world/npcs.ts";
import { FORGE_SWORD_PRICE, WEAPONS, type WeaponId, type WeaponLoadout } from "./Weapons.ts";

/** Regras da bolsa compartilhadas pela simulação solo e pela sala Node. */
export const MAX_STACK = 99;
export const QUEST_REWARD_POTIONS = 2;
export const POTION_HEAL = 35;
export const POTION_GEL_PRICE = 3;
export type PotionTradeResult = "traded" | "insufficient-gel" | "potions-full";
export type SwordPurchaseResult = "purchased" | "already-owned" | "insufficient-sword-gel" | "too-far-from-forge" | "unavailable";
export type SwordEquipResult = "equipped" | "already-equipped" | "not-owned";

export interface InventoryState {
  gel: number;
  potion: number;
  questRewardClaimed: boolean;
  loadout?: WeaponLoadout;
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
  const loadout: WeaponLoadout | undefined = state.loadout?.forged === true
    ? { forged: true, equipped: state.loadout.equipped === "forge" ? "forge" : "starter" }
    : undefined;
  return {
    gel: count(state.gel),
    potion: count(state.potion),
    questRewardClaimed: state.questRewardClaimed === true,
    ...(loadout ? { loadout } : {}),
  };
}

export class Inventory {
  private gelCount = 0;
  private potionCount = 0;
  private claimed = false;
  private weapons: WeaponLoadout;

  constructor(value?: unknown) {
    const state = normalizeInventory(value);
    this.gelCount = state.gel;
    this.potionCount = state.potion;
    this.claimed = state.questRewardClaimed;
    this.weapons = state.loadout ?? { forged: false, equipped: "starter" };
  }

  get gel(): number { return this.gelCount; }
  get potion(): number { return this.potionCount; }
  get questRewardClaimed(): boolean { return this.claimed; }
  get hasRoomForGel(): boolean { return this.gelCount < MAX_STACK; }
  get loadout(): WeaponLoadout { return this.weapons; }
  get weapon() { return WEAPONS[this.weapons.equipped]; }

  addGel(): boolean {
    if (!this.hasRoomForGel) return false;
    this.gelCount++;
    return true;
  }

  /** Recompensa única de Aela ao completar a missão de cinco slimes. */
  claimAelaReward(kills: number): boolean {
    if (!aelaQuestProgress(kills).completed || this.claimed ||
        this.potionCount > MAX_STACK - QUEST_REWARD_POTIONS) return false;
    this.potionCount += QUEST_REWARD_POTIONS;
    this.claimed = true;
    return true;
  }

  tradeGelForPotion(): PotionTradeResult {
    if (this.gelCount < POTION_GEL_PRICE) return "insufficient-gel";
    if (this.potionCount >= MAX_STACK) return "potions-full";
    this.gelCount -= POTION_GEL_PRICE;
    this.potionCount++;
    return "traded";
  }

  buyForgeSword(hero: { x: number; y: number; hp: number }): SwordPurchaseResult {
    if (hero.hp <= 0) return "unavailable";
    if (nearestNpc(hero.x, hero.y)?.id !== "toren") return "too-far-from-forge";
    if (this.weapons.forged) return "already-owned";
    if (this.gelCount < FORGE_SWORD_PRICE) return "insufficient-sword-gel";
    this.gelCount -= FORGE_SWORD_PRICE;
    this.weapons = { ...this.weapons, forged: true };
    return "purchased";
  }

  equipWeapon(weapon: WeaponId): SwordEquipResult {
    if (weapon === this.weapons.equipped) return "already-equipped";
    if (weapon === "forge" && !this.weapons.forged) return "not-owned";
    this.weapons = { ...this.weapons, equipped: weapon };
    return "equipped";
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
      ...(this.weapons.forged ? { loadout: this.weapons } : {}),
    };
  }
}
