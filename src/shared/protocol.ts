import type { PotionTradeResult, SwordEquipResult, SwordPurchaseResult } from "../engine/Inventory.ts";
import type { WeaponId, WeaponLoadout } from "../engine/Weapons.ts";
import type { LootDrop } from "../engine/loot.ts";
import { FOOD_IDS, type FoodCounts, type FoodId, type FoodTradeResult,
  type FoodUseResult, type NutritionState } from "../engine/Food.ts";
import { isGearId, isGearSlot, type GearId, type GearResult, type GearSlot, type GearState } from "../engine/Equipment.ts";

/** Version 3 shares village building collision with clients and the server. */
export const PROTOCOL_VERSION = 3;
export interface HeroState {
  id: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  kills: number;
  experience?: number;
  /** Optional authoritative number of deaths followed by an automatic respawn. */
  respawns?: number;
  faceX: number;
  faceY: number;
  walkTime: number;
  attackTime: number;
  /** Sword committed to an active swing, never the next selected sword. */
  attackWeapon?: WeaponId;
  /** Optional sword visibly held in idle poses; omitted for the starter sword. */
  equippedWeapon?: WeaponId | undefined;
  /** Visual equipment snapshot for nearby heroes; never an authority for stats. */
  gear?: GearState | undefined;
  vx?: number;
  vy?: number;
  hurtTime?: number;
  /** Current committed endpoint; visual interpolation only. */
  stepTarget?: WalkTarget | null;
}
export interface MobState {
  id: string;
  x: number;
  y: number;
  hp: number;
  bounce: number;
  hurtTime?: number;
}
export type InputMessage = {
  type: "input";
  x: number;
  y: number;
  attack: boolean;
};
export type WalkTarget = { readonly x: number; readonly y: number };
export type WalkMessage = { type: "walk"; target: WalkTarget | null };
export type TargetMessage = { type: "target"; id: string | null };
export type CombatFocus = { readonly id: string; readonly following: boolean };
export type InventoryAction = "use-potion" | "trade-potion" | "buy-sword" | "equip-starter" | "equip-forge" |
  `eat-${FoodId}` | `buy-${FoodId}`;
export type InventoryOrder = { action: InventoryAction } | { action: "set-gear"; slot: GearSlot; item: GearId | null };
export type InventoryMessage = InventoryOrder & { type: "inventory"; requestId: number };
export type InventoryOutcome = PotionTradeResult | SwordPurchaseResult | SwordEquipResult | GearResult | FoodTradeResult | FoodUseResult |
  "healed" | "full-health" | "no-potion" | "too-far";
export type InventoryReceipt = Pick<InventoryMessage, "requestId" | "action"> & { outcome: InventoryOutcome };
export interface RoomInventoryState {
  gel: number;
  potion: number;
  food?: FoodCounts;
  nutrition?: NutritionState;
  drops: LootDrop[];
  receipt: InventoryReceipt | null;
  loadout?: WeaponLoadout;
  gear?: GearState;
}
export type RoomState = {
  players: HeroState[];
  mobs: MobState[];
  time?: number;
  walkTarget?: WalkTarget | null;
  focus?: CombatFocus | null;
  inventory?: RoomInventoryState;
};
export type ClientMessage = InputMessage | WalkMessage | TargetMessage | InventoryMessage;
export type ServerMessage =
  | { type: "welcome"; version: number; id: string; room: string; seed: number; movement?: "tiles"; combat?: "target"; inventory?: "loot" }
  | ({ type: "state" } & RoomState)
  | { type: "error"; message: string };
export function isValidInput(value: unknown): value is InputMessage {
  if (!value || typeof value !== "object") return false;
  const m = value as Partial<InputMessage>;
  return (
    m.type === "input" &&
    typeof m.x === "number" &&
    Number.isFinite(m.x) &&
    typeof m.y === "number" &&
    Number.isFinite(m.y) &&
    Math.hypot(m.x, m.y) <= 1.05 &&
    typeof m.attack === "boolean"
  );
}
export function isWalkTarget(value: unknown): value is WalkTarget {
  if (!value || typeof value !== "object") return false;
  const { x, y } = value as Partial<WalkTarget>;
  return typeof x === "number" && Math.abs(x) <= 1_000_000 &&
    typeof y === "number" && Math.abs(y) <= 1_000_000;
}
export function isValidWalk(value: unknown): value is WalkMessage {
  if (!value || typeof value !== "object") return false;
  const m = value as Partial<WalkMessage>;
  return m.type === "walk" && (m.target === null || isWalkTarget(m.target));
}
export function isValidTarget(value: unknown): value is TargetMessage {
  if (!value || typeof value !== "object") return false;
  const m = value as Partial<TargetMessage>;
  return m.type === "target" && (m.id === null ||
    (typeof m.id === "string" && /^[\w,-]{1,64}$/.test(m.id)));
}
export function isValidInventoryMessage(value: unknown): value is InventoryMessage {
  if (!value || typeof value !== "object") return false;
  const m = value as Partial<InventoryMessage>;
  if (m.type !== "inventory" || typeof m.requestId !== "number" || !Number.isSafeInteger(m.requestId) || m.requestId <= 0)
    return false;
  if (m.action === "set-gear") return isGearSlot(m.slot) && (m.item === null || isGearId(m.item));
  return m.action === "use-potion" || m.action === "trade-potion" || m.action === "buy-sword" ||
    m.action === "equip-starter" || m.action === "equip-forge" ||
    FOOD_IDS.some(id => m.action === `eat-${id}` || m.action === `buy-${id}`);
}
export function validRoom(room: string): boolean {
  return /^[a-z0-9-]{1,24}$/.test(room);
}
