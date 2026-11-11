import { computed, Injectable, signal } from '@angular/core';
import type { CaveMapState, GameUi, HeroHudState, NearbyAction, NpcOffer, Preferences } from '../ui/GameUi.ts';
import { MOUNTS, MOUNT_IDS, RIDING_LEVEL, STABLE_UPGRADE_PRICE, type MountId } from '../actors/MountCatalog.ts';
import type { MountAction, MountView } from '../engine/mounts/MountStable.ts';
import { WEAPONS, WEAPON_IDS, weaponUnlocked, type WeaponId, type WeaponLoadout } from '../engine/character/Weapons.ts';
import { EQUIPMENT_SLOTS, GEAR, gearDefense, type EquipmentSlot, type GearId, type GearSlot, type GearState } from '../engine/character/Equipment.ts';
import type { BattleCreature } from '../engine/combat/ClassicBattleList.ts';
import type { AelaQuestProgress } from '../world/aelaQuest.ts';
import type { ExperienceProgress } from '../engine/character/Experience.ts';
import { foodItemIcon, slotItemIcon, weaponItemIcon, type ItemIconId } from './item-icon.component.ts';
import { southRareLootByName } from '../monsters/rareLoot.ts';
import { SOUTH_MOUNT_SALES } from '../engine/mounts/southMountSales.ts';
import { COIN_TIERS, coinBreakdown, describeCoins, marketFor, materialSalePrice, type MarketId } from '../engine/character/coins/index.ts';
import type { WellQuestSummary } from '../engine/quests/south/well/types.ts';
import { ELIXIR_RECIPES, elixirRecipe, emptyElixirCounts, type ElixirCounts, type ElixirId } from '../engine/character/alchemy/index.ts';
import { FOOD_IDS, FOODS, MAX_NUTRITION, emptyFoodCounts, type FoodCounts, type FoodId, type NutritionState } from '../engine/character/Food.ts';

const ACTION_LABELS: Record<NearbyAction, string> = {
  talk: 'Conversar',
  read: 'Ler',
  enter: 'Entrar',
  leave: 'Subir',
  ascend: 'Subir',
  descend: 'Descer',
  tracks: 'Examinar pegadas',
  tame: 'Acalmar cavalo',
};
const KIT_IDS = Object.keys(GEAR) as GearId[];

/** Somente a visualização da bolsa; quantidades e propriedade vêm do motor. */
export interface BackpackItemView {
  readonly id: string;
  readonly kind: 'material' | 'potion' | 'food' | 'gear' | 'weapon' | 'coin' | 'elixir';
  readonly name: string;
  readonly description: string;
  readonly icon: ItemIconId;
  readonly quantity: number;
  readonly rarity?: 'rare';
  readonly foodId?: FoodId;
  readonly elixirId?: ElixirId;
  readonly gearId?: GearId;
  readonly weaponId?: WeaponId;
  readonly defense?: number;
  readonly comparedDefense?: number;
  readonly damage?: number;
  readonly comparedDamage?: number;
}
type BackpackFilter = 'all' | 'supplies' | 'gear';
type InventoryTab = 'bag' | 'equipment' | 'map';

@Injectable()
export class HudService implements GameUi {
  readonly mountCatalog = MOUNTS;
  /** O que o Domador Rukh vende no Poço Negro (ADR 0028). */
  readonly mountSales = SOUTH_MOUNT_SALES;
  buyMount(id: MountId): void { this.mountAction(`buy:${id}`); }
  rideMount(id: MountId): void { this.mountAction(`mount:${id}`); }
  readonly ridingLevelRequirement = RIDING_LEVEL;
  readonly stableUpgradeCost = STABLE_UPGRADE_PRICE;
  /** Valor em moedas para a tela, como "2 Cripta Coin e 50 Terrania Gold" (ADR 0025). */
  coinText(amount: number): string { return describeCoins(amount); }
  readonly mountIds = MOUNT_IDS;
  readonly mountView = signal<MountView>({
    stableTier:0,ridingTier:0,owned:[],active:null,stamina:0,maxStamina:0,
    quest:null,questHint:'Procure o Mestre de Estábulos na vila.',
  },{equal:(a,b)=>a.stableTier===b.stableTier&&a.ridingTier===b.ridingTier&&
    a.active===b.active&&Math.round(a.stamina)===Math.round(b.stamina)&&
    a.questHint===b.questHint&&a.quest?.id===b.quest?.id&&
    a.quest?.step===b.quest?.step&&a.quest?.count===b.quest?.count&&
    a.owned.join(',')===b.owned.join(',')});
  readonly mountFeedback = signal('');
  readonly travelNotice = signal('');
  private travelNoticeTimer: ReturnType<typeof setTimeout> | null = null;
  readonly targetCombat = signal(false);
  readonly combatTarget = signal<string | null>(null);
  readonly battleCreatures = signal<readonly BattleCreature[]>([]);
  readonly battleTargetId = signal<string | null>(null);
  readonly hp = signal(100);
  readonly awaitingRespawn = signal(false);
  readonly maxHp = signal(100);
  readonly progression = signal<ExperienceProgress | null>(null, {
    equal: (previous, next) => previous === next || (previous !== null && next !== null &&
      previous.level === next.level && previous.earned === next.earned && previous.needed === next.needed),
  });
  readonly quest = signal('Proteja a clareira');
  readonly questProgress = signal('');
  readonly questPercent = signal(0);
  readonly coords = signal('X 0 · Y 0');
  readonly mapTile = signal({ x: 0, y: 0 }, { equal: (a, b) => a.x === b.x && a.y === b.y });
  readonly seed = signal(842136);
  readonly cave = signal<CaveMapState | null>(null, {equal:(a,b)=> a===b ||
    (a!==null && b!==null && a.floor===b.floor && a.floorIndex===b.floorIndex && a.tileX===b.tileX && a.tileY===b.tileY)});
  readonly gel = signal(0);
  /** Dinheiro em Terrania Gold; as moedas maiores são calculadas por `coinBreakdown`. */
  readonly coins = signal(0);
  readonly creatureMaterials = signal<Readonly<Record<string,number>>>({}, {
    equal: (a,b) => a===b || (Object.keys(a).length===Object.keys(b).length &&
      Object.entries(a).every(([key,quantity])=>b[key]===quantity)),
  });
  readonly potions = signal(0);
  readonly elixirs = signal<ElixirCounts>(emptyElixirCounts());
  readonly elixirRecipes = ELIXIR_RECIPES;
  readonly foodIds = FOOD_IDS;
  readonly foodCatalog = FOODS;
  readonly food = signal<FoodCounts>(emptyFoodCounts());
  readonly nutrition = signal<NutritionState>({ reserve: 0, elapsed: 0, cooldown: 0 });
  readonly inventoryFeedback = signal('');
  readonly quickPotionFeedback = signal('');
  readonly weapons = WEAPONS;
  readonly availableWeapons = computed<readonly WeaponId[]>(() => {
    const level=this.progression()?.level ?? 1;
    const forged=this.loadout()?.forged ?? false;
    return WEAPON_IDS.filter(id=>weaponUnlocked(id,level,forged));
  });
  /** Todos os modelos ficam visíveis mesmo quando o jogador ainda não pode equipá-los. */
  readonly swordIds = WEAPON_IDS;
  weaponIcon(id: WeaponId): ItemIconId { return weaponItemIcon(id); }
  readonly equipmentSlots = EQUIPMENT_SLOTS;
  readonly gearCatalog = GEAR;
  readonly gear = signal<GearState | null>(null, { equal: (a, b) => a === b ||
    (a !== null && b !== null && EQUIPMENT_SLOTS.every(({ id }) => id === 'weapon' || a[id] === b[id])) });
  readonly selectedSlot = signal<EquipmentSlot>('weapon');
  readonly inventoryTab = signal<InventoryTab>('bag');
  readonly bagFilter = signal<BackpackFilter>('all');
  readonly selectedBagId = signal('potion');
  readonly backpackItems = computed<readonly BackpackItemView[]>(() => {
    const result: BackpackItemView[] = [
      { id: 'gel', kind: 'material', name: 'Gel de slime', icon: 'gel', quantity: this.gel(),
        description: 'Recurso de troca com Lina e Toren na vila.' },
      { id: 'potion', kind: 'potion', name: 'Poção de cura', icon: 'potion', quantity: this.potions(),
        description: 'Recupera 35 HP imediatamente, sem ultrapassar a vida máxima.' },
    ];
    // Moedas (ADR 0023): só aparecem as que o total forma; a Terrania Gold fica sempre, mesmo zerada.
    for (const { id, count } of coinBreakdown(this.coins())) {
      if (count <= 0 && id !== 'terrania-gold') continue;
      const coin = COIN_TIERS.find(tier => tier.id === id)!;
      result.push({ id: 'coin-' + id, kind: 'coin', name: coin.name, icon: id, quantity: count, description: coin.description });
    }
    const elixirs = this.elixirs();
    for (const recipe of ELIXIR_RECIPES) {
      result.push({ id: 'elixir-' + recipe.id, kind: 'elixir', name: recipe.name, icon: recipe.id,
        quantity: elixirs[recipe.id], elixirId: recipe.id, description: recipe.description });
    }
    for (const [name,quantity] of Object.entries(this.creatureMaterials()).sort(([a],[b])=>a.localeCompare(b))) {
      if (quantity <= 0) continue;
      const rare=southRareLootByName(name);
      result.push({id:'creature-material:'+name,kind:'material',name,
        icon:rare?.id ?? 'material', quantity,
        ...(rare ? {rarity:'rare' as const} : {}),
        description:rare ? 'ITEM RARO · Região Sul. '+rare.description :
          'Material obtido de uma criatura regional. Guardado na bolsa.'});
    }
    const food = this.food();
    for (const id of FOOD_IDS) {
      const item = FOODS[id];
      result.push({ id: 'food-' + id, kind: 'food', name: item.name, icon: foodItemIcon(id),
        quantity: food[id], foodId: id, description: 'Recupera até ' + item.healBudget + ' HP aos poucos.' });
    }
    const gear = this.gear();
    if (gear !== null) {
      for (const id of KIT_IDS) {
        const item = GEAR[id];
        if (gear[item.slot] === id) continue;
        const current = gear[item.slot];
        result.push({ id: 'gear-' + id, kind: 'gear', gearId: id, name: item.name,
          icon: slotItemIcon(item.slot, 'starter'),
          quantity: 1, defense: item.defense, comparedDefense: current ? GEAR[current].defense : 0,
          description: 'Conjunto inicial · ' + (item.defense > 0 ? 'Defesa +' + item.defense : 'Acessório') });
      }
    }
    const loadout = this.loadout();
    if (loadout) {
      for (const id of this.availableWeapons()) {
        if (id === loadout.equipped) continue;
        const item = WEAPONS[id];
        result.push({ id: 'weapon-' + id, kind: 'weapon', weaponId: id, name: item.name,
          icon: weaponItemIcon(id), quantity: 1, damage: item.damage,
          comparedDamage: WEAPONS[loadout.equipped].damage,
          description: item.damage + ' de ataque · Nível ' + item.level + ' · ' + item.interval + 's entre golpes' });
      }
    }
    return result;
  });
  readonly visibleBackpackItems = computed(() => this.backpackItems().filter(item => {
    const filter = this.bagFilter();
    return filter === 'all' || (filter === 'gear'
      ? item.kind === 'gear' || item.kind === 'weapon'
      : item.kind !== 'gear' && item.kind !== 'weapon');
  }));
  readonly ownedBackpackCount = computed(() => this.backpackItems().filter(item => item.quantity > 0).length);
  readonly selectedBagItem = computed(() =>
    this.visibleBackpackItems().find(item => item.id === this.selectedBagId()) ?? null);
  readonly canUseSelectedBagItem = computed(() => {
    const item = this.selectedBagItem();
    if (!item || this.hp() <= 0) return false;
    if (item.kind === 'material' || item.kind === 'coin') return false;
    if (item.kind === 'potion') return item.quantity > 0 && this.hp() < this.maxHp();
    if (item.kind === 'elixir') return item.quantity > 0;
    if (item.kind === 'food') {
      return item.quantity > 0 && this.nutrition().cooldown <= 0 &&
        this.nutrition().reserve + (item.foodId ? FOODS[item.foodId].healBudget : 0) <= MAX_NUTRITION;
    }
    return item.quantity > 0;
  });
  readonly selectedGearOptions = computed(() => KIT_IDS.filter(id => GEAR[id].slot === this.selectedSlot()));
  readonly defense = computed(() => gearDefense(this.gear() ?? {}));
  readonly loadout = signal<WeaponLoadout | null>(null, { equal: (a, b) =>
    a?.forged === b?.forged && a?.equipped === b?.equipped });
  readonly talkVisible = signal(false);
  readonly talkLabel = signal('Conversar (E)');
  readonly npcName = signal('');
  readonly npcRole = signal('');
  readonly npcSpeech = signal('');
  readonly npcStep = signal('');
  readonly npcLast = signal(false);
  readonly npcOffer = signal<NpcOffer | null>(null);
  readonly npcTradeFeedback = signal('');
  readonly dialogueRequested = signal(0);
  readonly preferences = signal<Preferences>({ zoom: 1.65, effects: true, cameraMotion: true });
  menuOpen = false;
  private npcLines: readonly string[] = [];
  private npcPage = 0;
  private preferencesCallback: (value: Preferences) => void = () => {};
  private newWorldCallback: () => void = () => {};
  private talkCallback: () => void = () => {};
  private potionTradeCallback: () => string = () => '';
  private innRestCallback: () => string = () => '';
  private elixirCraftCallback: (id: ElixirId) => string = () => '';
  private elixirUseCallback: (id: ElixirId) => string = () => '';
  private materialSaleCallback: (market: MarketId, material: string, quantity: number) => string = () => '';
  private potionCallback: () => string = () => '';
  private foodCallback: (id: FoodId) => string = () => '';
  private foodTradeCallback: (id: FoodId) => string = () => '';
  private swordPurchaseCallback: () => string = () => '';
  private weaponEquipCallback: (weapon: WeaponId) => string = () => '';
  private gearEquipCallback: (slot: GearSlot, item: GearId | null) => string = () => '';
  private respawnCallback: () => void = () => {};
  private mountActionCallback: (action: MountAction) => string = () => '';
  private stopCombatCallback: () => void = () => {};
  private battleSelectCallback: (id: string) => void = () => {};

  loadPreferences(): Preferences {
    let saved: Partial<Preferences> = {};
    try {
      const raw: unknown = JSON.parse(localStorage.getItem('terrania-preferences-v1') ?? '{}');
      if (raw && typeof raw === 'object') saved = raw;
    } catch { /* Storage is optional. */ }
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const p = {
      zoom: typeof saved.zoom === 'number' && Number.isFinite(saved.zoom) ? Math.min(2.5, Math.max(1, saved.zoom)) : innerWidth < 600 ? 1.5 : 1.65,
      effects: typeof saved.effects === 'boolean' ? saved.effects : !reduce,
      cameraMotion: typeof saved.cameraMotion === 'boolean' ? saved.cameraMotion : !reduce,
    };
    this.preferences.set(p);
    return p;
  }
  changePreferences(value: Preferences): void {
    this.preferences.set(value);
    try { localStorage.setItem('terrania-preferences-v1', JSON.stringify(value)); } catch { /* Optional. */ }
    this.preferencesCallback(value);
  }
  onPreferences(callback: (p: Preferences) => void): void { this.preferencesCallback = callback; }
  onNewWorld(callback: () => void): void { this.newWorldCallback = callback; }
  onTalk(callback: () => void): void { this.talkCallback = callback; }
  onPotionTrade(callback: () => string): void { this.potionTradeCallback = callback; }
  onPotionUse(callback: () => string): void { this.potionCallback = callback; }
  onElixirCraft(callback: (id: ElixirId) => string): void { this.elixirCraftCallback = callback; }
  onElixirUse(callback: (id: ElixirId) => string): void { this.elixirUseCallback = callback; }
  onFoodUse(callback: (id: FoodId) => string): void { this.foodCallback = callback; }
  onFoodTrade(callback: (id: FoodId) => string): void { this.foodTradeCallback = callback; }
  onSwordPurchase(callback: () => string): void { this.swordPurchaseCallback = callback; }
  onInnRest(callback: () => string): void { this.innRestCallback = callback; }
  onMaterialSale(callback: (market: MarketId, material: string, quantity: number) => string): void { this.materialSaleCallback = callback; }
  onWeaponEquip(callback: (weapon: WeaponId) => string): void { this.weaponEquipCallback = callback; }
  onGearEquip(callback: (slot: GearSlot, item: GearId | null) => string): void { this.gearEquipCallback = callback; }
  onRespawn(callback: () => void): void { this.respawnCallback = callback; }
  onMountAction(callback:(action:MountAction)=>string):void {this.mountActionCallback=callback;}
  updateMount(view:MountView):void {this.mountView.set(view);}
  mountAction(action:MountAction):void {
    const message=this.mountActionCallback(action);
    this.mountFeedback.set(message);
    this.npcTradeFeedback.set(message);
  }
  onStopCombat(callback: () => void): void { this.stopCombatCallback = callback; }
  onBattleSelect(callback: (id: string) => void): void { this.battleSelectCallback = callback; }
  selectBattleCreature(id: string): void { this.battleSelectCallback(id); }
  setBattleCreatures(creatures: readonly BattleCreature[], targetId: string | null): void {
    const previous = this.battleCreatures();
    const same = creatures.length === previous.length && creatures.every((row, i) => {
      const old = previous[i];
      return old !== undefined && row.id === old.id && row.name === old.name &&
        row.hp === old.hp && row.maxHp === old.maxHp && row.distanceTiles === old.distanceTiles;
    });
    if (!same) this.battleCreatures.set(creatures);
    if (this.battleTargetId() !== targetId) this.battleTargetId.set(targetId);
  }
  stopCombat(): void { this.stopCombatCallback(); }
  newWorld(): void { this.newWorldCallback(); }
  talk(): void { this.talkCallback(); }
  tradePotion(): void { this.npcTradeFeedback.set(this.potionTradeCallback()); }
  restAtInn(): void { this.npcTradeFeedback.set(this.innRestCallback()); }
  craftElixir(id: ElixirId): void { this.npcTradeFeedback.set(this.elixirCraftCallback(id)); }
  drinkElixir(id: ElixirId): void { this.inventoryFeedback.set(this.elixirUseCallback(id)); }
  /** Quantos ingredientes da receita o herói já tem, para a tela da Casa de Venenos. */
  ingredientOwned(material: string): number { return this.creatureMaterials()[material] ?? 0; }
  canCraft(id: ElixirId): boolean {
    const recipe = elixirRecipe(id);
    return this.coins() >= recipe.price && this.elixirs()[id] < 99 &&
      recipe.ingredients.every(({ material, quantity }) => this.ingredientOwned(material) >= quantity);
  }
  /** Vende `quantity` unidades (ou tudo, com um número grande) do material à banca aberta (ADR 0026). */
  sellMaterial(market: MarketId, material: string, quantity: number): void {
    this.npcTradeFeedback.set(this.materialSaleCallback(market, material, quantity));
  }
  /** O que o herói tem e esta banca compra, com o preço de cada unidade em Terrania Gold. */
  sellableMaterials(market: MarketId): ReadonlyArray<{ name: string; quantity: number; price: number }> {
    return Object.entries(this.creatureMaterials())
      .filter(([name, quantity]) => quantity > 0 && marketFor(name) === market)
      .map(([name, quantity]) => ({ name, quantity, price: materialSalePrice(name) ?? 0 }))
      .sort((a, b) => b.price - a.price || a.name.localeCompare(b.name));
  }
  usePotion(): void {
    const message = this.potionCallback();
    this.inventoryFeedback.set(message);
    this.quickPotionFeedback.set(message);
  }
  useFood(id: FoodId): void { this.inventoryFeedback.set(this.foodCallback(id)); }
  tradeFood(id: FoodId): void { this.npcTradeFeedback.set(this.foodTradeCallback(id)); }
  selectBagItem(id: string): void { this.selectedBagId.set(id); }
  /** O clique solicita operações existentes; a UI nunca desconta itens localmente. */
  useSelectedBagItem(): void {
    const item = this.selectedBagItem();
    if (!item || !this.canUseSelectedBagItem()) return;
    if (item.kind === 'potion') this.usePotion();
    else if (item.kind === 'food' && item.foodId) this.useFood(item.foodId);
    else if (item.kind === 'elixir' && item.elixirId) this.drinkElixir(item.elixirId);
    else if (item.kind === 'gear' && item.gearId) this.equipGear(item.gearId);
    else if (item.kind === 'weapon' && item.weaponId) this.equipWeapon(item.weaponId);
  }
  selectEquipmentSlot(slot: EquipmentSlot): void {
    this.selectedSlot.set(slot);
    this.inventoryTab.set('equipment');
  }
  buySword(): void { this.npcTradeFeedback.set(this.swordPurchaseCallback()); }
  equipWeapon(weapon: WeaponId): void { this.inventoryFeedback.set(this.weaponEquipCallback(weapon)); }
  equipGear(id: GearId): void {
    const { slot } = GEAR[id];
    this.inventoryFeedback.set(this.gearEquipCallback(slot, this.gear()?.[slot] === id ? null : id));
  }
  /** Ícone do espaço: a arma mostra a espada realmente equipada. */
  slotIcon(slot: EquipmentSlot): ItemIconId {
    return slotItemIcon(slot, this.loadout()?.equipped ?? 'starter');
  }
  equippedName(slot: EquipmentSlot): string {
    if (slot === 'weapon') {
      const loadout = this.loadout();
      return loadout ? WEAPONS[loadout.equipped].name : '';
    }
    const id = this.gear()?.[slot];
    return id ? GEAR[id].name : '';
  }
  respawn(): void { this.respawnCallback(); }
  updateInventory(gel: number, potions: number, food: FoodCounts,
    materials: Readonly<Record<string,number>> = {}, coins = 0, elixirs: ElixirCounts = emptyElixirCounts()): void {
    this.elixirs.set(elixirs);
    this.gel.set(gel); this.potions.set(potions); this.food.set(food);
    this.coins.set(coins);
    this.creatureMaterials.set(materials);
  }
  updateLoadout(loadout: WeaponLoadout | null): void { this.loadout.set(loadout); }
  updateGear(gear: GearState | null): void { this.gear.set(gear); }
  setInventoryFeedback(section: 'bag' | 'npc', message: string): void {
    (section === 'bag' ? this.inventoryFeedback : this.npcTradeFeedback).set(message);
  }
  setQuickPotionFeedback(message: string): void { this.quickPotionFeedback.set(message); }
  setTravelNotice(message: string): void {
    this.dismissTravelNotice();
    if (!message) return;
    this.travelNotice.set(message);
    this.travelNoticeTimer = setTimeout(() => {
      this.travelNotice.set('');
      this.travelNoticeTimer = null;
    }, 6500);
  }
  dismissTravelNotice(): void {
    if (this.travelNoticeTimer !== null) clearTimeout(this.travelNoticeTimer);
    this.travelNoticeTimer = null;
    this.travelNotice.set('');
  }
  setTargetCombat(enabled: boolean): void { this.targetCombat.set(enabled); }
  setCombatTarget(label: string | null): void { this.combatTarget.set(label); }
  setSeed(seed: number): void { this.seed.set(seed); }
  setCave(location:CaveMapState|null):void {
    this.cave.set(location);
    if(location) {
      this.coords.set((location.floor.entrance.tower ? "Torre" : "Subsolo")+" · X "+location.tileX+" · Y "+location.tileY);
      this.quest.set(location.floor.name);
      this.questProgress.set(location.floorCount > 1
        ? "Andar " + location.floorIndex + " de " + location.floorCount + " · " + location.floorName
        : "Andar −1 · retorne pela escada");
    }
  }
  setNearbyAction(action: NearbyAction | null): void {
    this.talkVisible.set(action !== null);
    if (action) this.talkLabel.set(`${ACTION_LABELS[action]} (E)`);
  }
  showNpcDialogue(name: string, role: string, lines: readonly string[], offer?: NpcOffer): void {
    this.npcLines = lines;
    this.npcPage = 0;
    this.npcOffer.set(offer ?? null);
    this.npcTradeFeedback.set('');
    this.npcName.set(name); this.npcRole.set(role); this.updateNpcPage();
    // Pause synchronously; the component opens the native dialog on the next render.
    this.menuOpen = true;
    this.dialogueRequested.update(value => value + 1);
  }
  private updateNpcPage(): void {
    this.npcSpeech.set(this.npcLines[this.npcPage] ?? '');
    this.npcStep.set(`Mensagem ${this.npcPage + 1} de ${this.npcLines.length}`);
    this.npcLast.set(this.npcPage === this.npcLines.length - 1);
  }
  nextNpc(): boolean {
    if (++this.npcPage >= this.npcLines.length) return false;
    this.updateNpcPage(); return true;
  }
  setInterior(name: string): void {
    this.talkVisible.set(true); this.talkLabel.set('Sair (E)');
    this.quest.set(name); this.questProgress.set('E ou porta: sair');
    this.coords.set('Interior · Vila da Travessia');
  }
  updateHero(hero: HeroHudState, quest: AelaQuestProgress, well?: WellQuestSummary): void {
    this.hp.set(hero.hp); this.maxHp.set(hero.maxHp);
    this.nutrition.set(hero.nutrition);
    this.awaitingRespawn.set(hero.awaitingRespawn);
    this.progression.set(hero.progression);
    // Uma missão no painel: a da clareira até ser concluída; depois a do poço, se já começou (ADR 0031).
    if (quest.completed && well?.started) {
      this.quest.set(well.title);
      this.questProgress.set(well.progress);
      this.questPercent.set(well.percent);
    } else {
      this.quest.set(quest.completed ? 'Clareira protegida' : 'Proteja a clareira');
      this.questProgress.set(quest.completed ? 'Missão concluída ✓' : `${quest.defeated} / ${quest.goal} slimes`);
      this.questPercent.set(quest.defeated / quest.goal * 100);
    }
    this.mapTile.set({ x: hero.tileX, y: hero.tileY });
    this.coords.set(`X ${hero.tileX} · Y ${hero.tileY}`);
  }
}
