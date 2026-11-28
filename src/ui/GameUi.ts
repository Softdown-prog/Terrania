import type { JournalEntry } from '../engine/quests/journal/index.ts';
import type { BattleCreature } from '../engine/combat/ClassicBattleList.ts';
import type { ExperienceProgress } from '../engine/character/Experience.ts';
import type { ElixirCounts, ElixirId } from '../engine/character/south/alchemy/index.ts';
import type { MarketId } from '../engine/character/coins/index.ts';
import type { RespawnPointId } from '../engine/character/center/shrine/index.ts';
import type { HeroClassId, ManaMeter } from '../engine/character/classes/index.ts';
import type { StaffId } from '../engine/character/Staves.ts';
import type { BowId } from '../engine/character/Bows.ts';
import type { ArrowId } from '../engine/character/Arrows.ts';
import type { Quiver } from '../engine/character/Quiver.ts';
import type { StaffLoadout } from '../engine/character/StaffLoadout.ts';
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
  /** A barra de mana (ADR 0071); `null` para quem não usa mana. */
  readonly mana: ManaMeter | null;
  /** A vocação e o cajado do herói (ADR 0072): o inventário e a prévia mostram o que é dele. */
  readonly heroClass: HeroClassId;
  readonly equippedStaff: StaffId;
  /** O arco do Arqueiro (ADR 0113). */
  readonly equippedBow: BowId;
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
export type NpcOffer = { item: 'potion' | 'sword' | 'stable' | 'rest' | 'bazaar' | 'ossuary' | 'desert-stable' | 'alchemy' | 'bank' | 'shrine' | 'academy' | 'archery'; price: number };

/** Data and commands exchanged between the game coordinator and the HUD. */
export interface GameUi {
  readonly menuOpen: boolean;
  loadPreferences(): Preferences;
  onPreferences(callback: (preferences: Preferences) => void): void;
  onNewWorld(callback: () => void): void;
  onTalk(callback: () => void): void;
  onPotionTrade(callback: () => string): void;
  onPotionUse(callback: () => string): void;
  /** O jogador escolheu um destino no mapa do mundo (em tiles); devolve o aviso. A viagem de longa distância (ADR 0099). */
  onJourneyStart(callback: (tileX: number, tileY: number) => string): void;
  onJourneyCancel(callback: () => void): void;
  /** Quantos tiles faltam da viagem em andamento; `null` sem viagem. */
  setJourney(remainingTiles: number | null): void;
  onFoodUse(callback: (id: FoodId) => string): void;
  onFoodTrade(callback: (id: FoodId) => string): void;
  onSwordPurchase(callback: () => string): void;
  onInnRest(callback: () => string): void;
  /** Banco da Casa da Moeda (ADR 0063): guardar e retirar moedas (valor em Terrania Gold ou "all"). */
  onBankDeposit(callback: (amount: number | 'all') => string): void;
  onBankWithdraw(callback: (amount: number | 'all') => string): void;
  updateBank(balance: number): void;
  /** Tela de escolha do herói (ADR 0066): abre a janela e chama `onChoose` quando o jogador escolhe uma vocação jogável. */
  promptHeroClass(onChoose: (heroClass: HeroClassId) => void): void;
  /** Templo da Concórdia (ADR 0064): escolher onde renascer, e mostrar onde já se renasce. */
  onShrineChoose(callback: (point: RespawnPointId) => string): void;
  updateRespawnPoint(point: RespawnPointId): void;
  onElixirCraft(callback: (id: ElixirId) => string): void;
  onElixirUse(callback: (id: ElixirId) => string): void;
  onMaterialSale(callback: (market: MarketId, material: string, quantity: number) => string): void;
  onWeaponEquip(callback: (weapon: WeaponId) => string): void;
  onStaffEquip(callback: (staff: StaffId) => string): void;
  onStaffBuy(callback: (staff: StaffId) => string): void;
  /** A compra de um pacote de flechas na Irmandade dos Arqueiros e a troca da flecha em uso (ADR 0118). */
  onArrowBuy(callback: (arrow: ArrowId) => string): void;
  onArrowEquip(callback: (arrow: ArrowId) => string): void;
  onGearEquip(callback: (slot: GearSlot, item: GearId | null) => string): void;
  onRespawn(callback: () => void): void;
  onMountAction(callback: (action: MountAction) => string): void;
  updateMount(view: MountView): void;
  updateInventory(gel: number, potions: number, food: FoodCounts,
    materials?: Readonly<Record<string,number>>, coins?: number, elixirs?: ElixirCounts): void;
  updateLoadout(loadout: WeaponLoadout | null): void;
  /** Os cajados comprados do Mago (ADR 0073). */
  updateStaves(loadout: StaffLoadout): void;
  /** A aljava do Arqueiro (ADR 0113). */
  updateQuiver(quiver: Quiver): void;
  updateGear(gear: GearState | null): void;
  setInventoryFeedback(section: 'bag' | 'npc', message: string): void;
  setQuickPotionFeedback(message: string): void;
  updateHero(hero: HeroHudState): void;
  /** O diário de missões (ADR 0100): todas as missões, com etapas; o painel da tela acompanha uma em andamento. */
  updateJournal(entries: readonly JournalEntry[]): void;
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
  setInterior(name: string, place?: string): void;
}
