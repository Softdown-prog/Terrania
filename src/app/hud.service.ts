import { computed, Injectable, signal } from '@angular/core';
import type { CaveMapState, GameUi, HeroHudState, NearbyAction, NpcOffer, Preferences } from '../ui/GameUi.ts';
import { MOUNTS, MOUNT_IDS, RIDING_LEVEL, STABLE_UPGRADE_GEL } from '../actors/MountCatalog.ts';
import type { MountAction, MountView } from '../engine/MountStable.ts';
import { WEAPONS, type WeaponId, type WeaponLoadout } from '../engine/Weapons.ts';
import { EQUIPMENT_SLOTS, GEAR, gearDefense, type EquipmentSlot, type GearId, type GearSlot, type GearState } from '../engine/Equipment.ts';
import type { BattleCreature } from '../engine/ClassicBattleList.ts';
import type { AelaQuestProgress } from '../world/aelaQuest.ts';
import type { ExperienceProgress } from '../engine/Experience.ts';
import { foodItemIcon, slotItemIcon, weaponItemIcon, type ItemIconId } from './item-icon.component.ts';
import { FOOD_IDS, FOODS, MAX_NUTRITION, emptyFoodCounts, type FoodCounts, type FoodId, type NutritionState } from '../engine/Food.ts';

const ACTION_LABELS: Record<NearbyAction, string> = {
  talk: 'Conversar',
  read: 'Ler',
  enter: 'Entrar',
  leave: 'Subir',
  tracks: 'Examinar pegadas',
  tame: 'Acalmar cavalo',
};
const KIT_IDS = Object.keys(GEAR) as GearId[];

/** Somente a visualização da bolsa; quantidades e propriedade vêm do motor. */
export interface BackpackItemView {
  readonly id: string;
  readonly kind: 'material' | 'potion' | 'food' | 'gear' | 'weapon';
  readonly name: string;
  readonly description: string;
  readonly icon: ItemIconId;
  readonly quantity: number;
  readonly foodId?: FoodId;
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
  readonly ridingLevelRequirement = RIDING_LEVEL;
  readonly stableUpgradeCost = STABLE_UPGRADE_GEL;
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
    (a!==null && b!==null && a.floor===b.floor && a.tileX===b.tileX && a.tileY===b.tileY)});
  readonly gel = signal(0);
  readonly creatureMaterials = signal<Readonly<Record<string,number>>>({}, {
    equal: (a,b) => a===b || (Object.keys(a).length===Object.keys(b).length &&
      Object.entries(a).every(([key,quantity])=>b[key]===quantity)),
  });
  readonly potions = signal(0);
  readonly foodIds = FOOD_IDS;
  readonly foodCatalog = FOODS;
  readonly food = signal<FoodCounts>(emptyFoodCounts());
  readonly nutrition = signal<NutritionState>({ reserve: 0, elapsed: 0, cooldown: 0 });
  readonly inventoryFeedback = signal('');
  readonly quickPotionFeedback = signal('');
  readonly weapons = WEAPONS;
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
    for (const [name,quantity] of Object.entries(this.creatureMaterials()).sort(([a],[b])=>a.localeCompare(b))) {
      if (quantity <= 0) continue;
      result.push({id:'creature-material:'+name,kind:'material',name,icon:'material',
        quantity,description:'Material obtido de uma criatura regional. Guardado na bolsa.'});
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
      for (const id of ['starter', 'forge'] as const) {
        if (id === loadout.equipped || (id === 'forge' && !loadout.forged)) continue;
        const item = WEAPONS[id];
        result.push({ id: 'weapon-' + id, kind: 'weapon', weaponId: id, name: item.name,
          icon: weaponItemIcon(id), quantity: 1, damage: item.damage,
          comparedDamage: WEAPONS[loadout.equipped].damage,
          description: item.damage + ' dano · ' + item.interval + 's entre golpes' });
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
    if (item.kind === 'material') return false;
    if (item.kind === 'potion') return item.quantity > 0 && this.hp() < this.maxHp();
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
  onFoodUse(callback: (id: FoodId) => string): void { this.foodCallback = callback; }
  onFoodTrade(callback: (id: FoodId) => string): void { this.foodTradeCallback = callback; }
  onSwordPurchase(callback: () => string): void { this.swordPurchaseCallback = callback; }
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
    materials: Readonly<Record<string,number>> = {}): void {
    this.gel.set(gel); this.potions.set(potions); this.food.set(food);
    this.creatureMaterials.set(materials);
  }
  updateLoadout(loadout: WeaponLoadout | null): void { this.loadout.set(loadout); }
  updateGear(gear: GearState | null): void { this.gear.set(gear); }
  setInventoryFeedback(section: 'bag' | 'npc', message: string): void {
    (section === 'bag' ? this.inventoryFeedback : this.npcTradeFeedback).set(message);
  }
  setQuickPotionFeedback(message: string): void { this.quickPotionFeedback.set(message); }
  /** Transition feedback must not become a permanent obstruction on mobile. */
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
      this.coords.set("Subsolo · X "+location.tileX+" · Y "+location.tileY);
      this.quest.set(location.floor.name);
      this.questProgress.set("Andar −1 · retorne pela escada");
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
  updateHero(hero: HeroHudState, quest: AelaQuestProgress): void {
    this.hp.set(hero.hp); this.maxHp.set(hero.maxHp);
    this.nutrition.set(hero.nutrition);
    this.awaitingRespawn.set(hero.awaitingRespawn);
    this.progression.set(hero.progression);
    this.quest.set(quest.completed ? 'Clareira protegida' : 'Proteja a clareira');
    this.questProgress.set(quest.completed ? 'Missão concluída ✓' : `${quest.defeated} / ${quest.goal} slimes`);
    this.questPercent.set(quest.defeated / quest.goal * 100);
    this.mapTile.set({ x: hero.tileX, y: hero.tileY });
    this.coords.set(`X ${hero.tileX} · Y ${hero.tileY}`);
  }
}
