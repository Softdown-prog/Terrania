import type { AelaQuestProgress } from '../world/aelaQuest.ts';
import type { BattleCreature } from '../engine/ClassicBattleList.ts';
import type { ExperienceProgress } from '../engine/Experience.ts';
import type { FoodCounts, FoodId, NutritionState } from '../engine/Food.ts';
import type { WeaponId, WeaponLoadout } from '../engine/Weapons.ts';
import type { GearId, GearSlot, GearState } from '../engine/Equipment.ts';
import type { CaveFloor } from '../engine/CaveRoom.ts';

export interface Preferences {
  zoom: number;
  effects: boolean;
  cameraMotion: boolean;
}

export interface MapPlayer { readonly id: string; readonly tileX: number; readonly tileY: number; }

export interface HeroHudState {
  readonly hp: number;
  readonly maxHp: number;
  readonly nutrition: NutritionState;
  readonly tileX: number;
  readonly tileY: number;
  readonly progression: ExperienceProgress | null;
  readonly awaitingRespawn: boolean;
}

export type NearbyAction = 'talk' | 'read' | 'enter' | 'leave';
export interface CaveMapState {
  readonly floor: CaveFloor;
  readonly tileX: number;
  readonly tileY: number;
}
export type NpcOffer = { item: 'potion' | 'sword'; price: number };

/** Data and commands exchanged between the game coordinator and the HUD. */
export interface GameUi {
  readonly menuOpen: boolean;
  loadPreferences(): Preferences;
  onPreferences(callback: (preferences: Preferences) => void): void;
  onNewWorld(callback: () => void): void;
  onTalk(callback: () => void): void;
  onPotionTrade(callback: () => string): void;
  onPotionUse(callback: () => string): void;
  onFoodUse(callback: (id: FoodId) => string): void;
  onFoodTrade(callback: (id: FoodId) => string): void;
  onSwordPurchase(callback: () => string): void;
  onWeaponEquip(callback: (weapon: WeaponId) => string): void;
  onGearEquip(callback: (slot: GearSlot, item: GearId | null) => string): void;
  onRespawn(callback: () => void): void;
  updateInventory(gel: number, potions: number, available: boolean, pending: boolean, food: FoodCounts): void;
  updateLoadout(loadout: WeaponLoadout | null): void;
  updateGear(gear: GearState | null): void;
  setInventoryFeedback(section: 'bag' | 'npc', message: string): void;
  setQuickPotionFeedback(message: string): void;
  updateHero(hero: HeroHudState, quest: AelaQuestProgress): void;
  setOnline(online: boolean): void;
  setStatus(status: string): void;
  /** Explain an authoritative death or a newly created online session. */
  setTravelNotice(message: string): void;
  setTargetCombat(enabled: boolean): void;
  setCombatTarget(label: string | null): void;
  onStopCombat(callback: () => void): void;
  onBattleSelect(callback: (id: string) => void): void;
  setBattleCreatures(creatures: readonly BattleCreature[], targetId: string | null): void;
  setSeed(seed: number): void;
  setCave(location: CaveMapState | null): void;
  /** Only positions supplied by the interest-filtered server snapshots. */
  setMapPlayers(players: readonly MapPlayer[]): void;
  setPlayerCount(count: number, online: boolean): void;
  setNearbyAction(action: NearbyAction | null): void;
  showNpcDialogue(name: string, role: string, lines: readonly string[], offer?: NpcOffer): void;
  setInterior(name: string): void;
}
