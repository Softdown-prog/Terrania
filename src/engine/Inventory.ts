import { CREATURE_CATALOG, REGIONAL_CREATURE_KINDS } from "../actors/CreatureCatalog.ts";
import { MOUNT_IDS, MOUNTS } from "../actors/MountCatalog.ts";
import { aelaQuestProgress } from "../world/aelaQuest.ts";
import type { Player } from "../actors/Player.ts";
import { FOODS, emptyFoodCounts, normalizeFoodCounts, type FoodCounts, type FoodId,
  type FoodTradeResult, type FoodUseResult } from "./Food.ts";
import { nearestNpc } from "../world/npcs.ts";
import { FORGE_SWORD_PRICE, WEAPONS, isWeaponId, weaponUnlocked, type WeaponId, type WeaponLoadout } from "./Weapons.ts";
import { GEAR, gearDefense, isGearId, isGearSlot, normalizeGear, type GearId, type GearResult, type GearSlot, type GearState } from "./Equipment.ts";

/** Regras da bolsa do jogo solo (antes compartilhadas com a sala Node, já retirada). */
export const MAX_STACK = 99;
export const QUEST_REWARD_POTIONS = 2;
export const POTION_HEAL = 35;
export const POTION_GEL_PRICE = 3;
export type PotionTradeResult = "traded" | "insufficient-gel" | "potions-full";
export type SwordPurchaseResult = "purchased" | "already-owned" | "insufficient-sword-gel" | "too-far-from-forge" | "unavailable";
export type SwordEquipResult = "equipped" | "already-equipped" | "not-owned" | "level-too-low";
/** Tudo que uma ação da bolsa pode responder; a interface traduz cada valor em uma mensagem. */
export type InventoryOutcome = PotionTradeResult | SwordPurchaseResult | SwordEquipResult | GearResult |
  FoodTradeResult | FoodUseResult | "healed" | "full-health" | "no-potion" | "too-far";

export interface InventoryState {
  gel: number;
  potion: number;
  questRewardClaimed: boolean;
  food?: FoodCounts;
  loadout?: WeaponLoadout;
  gear?: GearState;
  materials?: Record<string, number>;
}

const KNOWN_MATERIALS = new Set([...REGIONAL_CREATURE_KINDS.flatMap(kind => CREATURE_CATALOG[kind].loot.map(item => item.item)),
  ...MOUNT_IDS.flatMap(id => MOUNTS[id].dropsOnTame.map(item => item.item))]);
export function normalizeMaterials(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [id, quantity] of Object.entries(value))
    if (KNOWN_MATERIALS.has(id) && typeof quantity === "number" &&
        Number.isSafeInteger(quantity) && quantity > 0) out[id] = Math.min(99, quantity);
  return out;
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
  const loadout: WeaponLoadout | undefined = state.loadout?.forged === true ||
    isWeaponId(state.loadout?.equipped)
    ? { forged: state.loadout?.forged === true,
        equipped: isWeaponId(state.loadout?.equipped) ? state.loadout.equipped : "starter" }
    : undefined;
  const gear = normalizeGear(state.gear);
  const food = normalizeFoodCounts(state.food);
  return {
    gel: count(state.gel),
    potion: count(state.potion),
    questRewardClaimed: state.questRewardClaimed === true,
    ...(Object.values(food).some(v => v > 0) ? { food } : {}),
    ...(loadout ? { loadout } : {}),
    ...(Object.keys(gear).length ? { gear } : {}),
    ...(Object.keys(normalizeMaterials(state.materials)).length ? { materials: normalizeMaterials(state.materials) } : {}),
  };
}

export class Inventory {
  private gelCount = 0;
  private materialCounts: Record<string, number> = {};
  private potionCount = 0;
  private foods: FoodCounts = emptyFoodCounts();
  private claimed = false;
  private weapons: WeaponLoadout;
  private equippedGear: GearState;

  private readonly level: number;
  constructor(value?: unknown, level = 1) {
    this.level = level;
    const state = normalizeInventory(value);
    this.gelCount = state.gel;
    this.materialCounts = normalizeMaterials(state.materials);
    this.potionCount = state.potion;
    this.foods = normalizeFoodCounts(state.food);
    this.claimed = state.questRewardClaimed;
    const restored=state.loadout ?? { forged: false, equipped: "starter" };
    this.weapons = weaponUnlocked(restored.equipped, this.level, restored.forged)
      ? restored : { ...restored, equipped: "starter" };
    this.equippedGear = state.gear ?? {};
  }

  get gel(): number { return this.gelCount; }
  get materials(): Readonly<Record<string, number>> { return { ...this.materialCounts }; }
  addMaterial(id: string): boolean {
    if (!KNOWN_MATERIALS.has(id) || (this.materialCounts[id] ?? 0) >= MAX_STACK) return false;
    this.materialCounts[id] = (this.materialCounts[id] ?? 0) + 1;
    return true;
  }
  /** Consumo atômico de recursos do estábulo; nunca deixa gel negativo. */
  spendGel(amount: number): boolean {
    if (!Number.isSafeInteger(amount) || amount <= 0 || this.gelCount < amount) return false;
    this.gelCount -= amount;
    return true;
  }
  get potion(): number { return this.potionCount; }
  get food(): FoodCounts { return { ...this.foods }; }
  get questRewardClaimed(): boolean { return this.claimed; }
  get hasRoomForGel(): boolean { return this.gelCount < MAX_STACK; }
  get loadout(): WeaponLoadout { return this.weapons; }
  get weapon() { return WEAPONS[this.weapons.equipped]; }
  get gear(): GearState { return this.equippedGear; }
  get defense(): number { return gearDefense(this.equippedGear); }

  equipGear(slot: GearSlot, item: GearId | null): GearResult {
    if (!isGearSlot(slot) || (item !== null && (!isGearId(item) || GEAR[item].slot !== slot))) return "wrong-slot";
    if ((this.equippedGear[slot] ?? null) === item) return "gear-unchanged";
    const next = { ...this.equippedGear };
    if (item === null) delete next[slot];
    else next[slot] = item;
    this.equippedGear = next;
    return item === null ? "gear-removed" : "gear-equipped";
  }

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

  tradeGelForFood(id: FoodId): FoodTradeResult {
    if (this.foods[id] >= MAX_STACK) return "food-stack-full";
    if (this.gelCount < FOODS[id].gelPrice) return "insufficient-gel";
    this.gelCount -= FOODS[id].gelPrice;
    this.foods[id]++;
    return "food-traded";
  }
  useFood(id: FoodId, hero: Player): FoodUseResult {
    if (this.foods[id] < 1) return "no-food";
    const outcome = hero.eatFood(id);
    if (outcome === "ate") this.foods[id]--;
    return outcome;
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

  equipWeapon(weapon: WeaponId, level: number = this.level): SwordEquipResult {
    if (!isWeaponId(weapon)) return "not-owned";
    if (weapon === this.weapons.equipped) return "already-equipped";
    // A espada de Toren requer compra antes de validar seu nível de uso.
    if (weapon === "forge" && !this.weapons.forged) return "not-owned";
    if (!Number.isInteger(level) || level < WEAPONS[weapon].level) return "level-too-low";
    if (!weaponUnlocked(weapon,level,this.weapons.forged)) return "not-owned";
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
      ...(Object.values(this.foods).some(v => v > 0) ? { food: { ...this.foods } } : {}),
      ...(this.weapons.forged || this.weapons.equipped !== "starter" ? { loadout: this.weapons } : {}),
      ...(Object.keys(this.equippedGear).length ? { gear: this.equippedGear } : {}),
      ...(Object.keys(this.materialCounts).length ? { materials: { ...this.materialCounts } } : {}),
    };
  }
}
