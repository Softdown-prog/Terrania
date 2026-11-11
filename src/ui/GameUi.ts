import type { AelaQuestProgress } from '../world/aelaQuest.ts';
import type { BattleCreature } from '../engine/combat/ClassicBattleList.ts';
import type { ExperienceProgress } from '../engine/character/Experience.ts';
import type { ElixirCounts, ElixirId } from '../engine/character/south/alchemy/index.ts';
import type { WellQuestSummary } from '../engine/quests/south/well/index.ts';
import type { MarketId } from '../engine/character/coins/index.ts';
import type { FoodCounts, FoodId, NutritionState } from '../engine/character/Food.ts';
import type { WeaponId, WeaponLoadout } from '../engine/character/Weapons.ts';
import type { GearId, GearSlot, GearState } from '../engine/character/Equipment.ts';
import type { CaveFloor } from '../world/caveFloor.ts';
import type { MountAction, MountView } from '../engine/mounts/MountStable.ts';

export interface Preferences {
  zoom: number;
  effects: boolean;
  cameraMotion: boolean;
}

export interface HeroHudState {
  readonly hp: number;
  readonly maxHp: number;
  readonly nutrition: NutritionState;
  readonly tileX: number;
  readonly tileY: number;
  readonly progression: ExperienceProgress | null;
  readonly awaitingRespawn: boolean;
}

export type NearbyAction = 'talk' | 'read' | 'enter' | 'leave' | 'ascend' | 'descend' | 'tracks' | 'tame';
export interface CaveMapState {
  readonly floor: CaveFloor;
  /** 1 = o andar da entrada. Cavernas comuns têm um andar só. */
  readonly floorIndex: number;
  readonly floorCount: number;
  /** Nome do andar (masmorra) ou o da própria caverna. */
  readonly floorName: string;
  readonly tileX: number;
  readonly tileY: number;
}
export type NpcOffer = { item: 'potion' | 'sword' | 'stable' | 'rest' | 'bazaar' | 'ossuary' | 'desert-stable' | 'alchemy'; price: number };

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
  onInnRest(callback: () => string): void;
  onElixirCraft(callback: (id: ElixirId) => string): void;
  onElixirUse(callback: (id: ElixirId) => string): void;
  onMaterialSale(callback: (market: MarketId, material: string, quantity: number) => string): void;
  onWeaponEquip(callback: (weapon: WeaponId) => string): void;
  onGearEquip(callback: (slot: GearSlot, item: GearId | null) => string): void;
  onRespawn(callback: () => void): void;
  onMountAction(callback: (action: MountAction) => string): void;
  updateMount(view: MountView): void;
  updateInventory(gel: number, potions: number, food: FoodCounts,
    materials?: Readonly<Record<string,number>>, coins?: number, elixirs?: ElixirCounts): void;
  updateLoadout(loadout: WeaponLoadout | null): void;
  updateGear(gear: GearState | null): void;
  setInventoryFeedback(section: 'bag' | 'npc', message: string): void;
  setQuickPotionFeedback(message: string): void;
  updateHero(hero: HeroHudState, quest: AelaQuestProgress, well?: WellQuestSummary): void;
  /** Avisos de transição (por exemplo, descer ou subir de uma caverna). */
  setTravelNotice(message: string): void;
  setTargetCombat(enabled: boolean): void;
  setCombatTarget(label: string | null): void;
  onStopCombat(callback: () => void): void;
  onBattleSelect(callback: (id: string) => void): void;
  setBattleCreatures(creatures: readonly BattleCreature[], targetId: string | null): void;
  setSeed(seed: number): void;
  setCave(location: CaveMapState | null): void;
  setNearbyAction(action: NearbyAction | null): void;
  showNpcDialogue(name: string, role: string, lines: readonly string[], offer?: NpcOffer): void;
  setInterior(name: string): void;
}
