import { computed, Injectable, signal } from '@angular/core';
import type { GameUi, HeroHudState, NearbyAction, NpcOffer, Preferences } from '../ui/GameUi.ts';
import { WEAPONS, type WeaponId, type WeaponLoadout } from '../engine/Weapons.ts';
import { EQUIPMENT_SLOTS, GEAR, gearDefense, type EquipmentSlot, type GearId, type GearSlot, type GearState } from '../engine/Equipment.ts';
import type { BattleCreature } from '../engine/ClassicBattleList.ts';
import type { AelaQuestProgress } from '../world/aelaQuest.ts';
import type { ExperienceProgress } from '../engine/Experience.ts';
import { FOOD_IDS, FOODS, MAX_NUTRITION, emptyFoodCounts, type FoodCounts, type FoodId, type NutritionState } from '../engine/Food.ts';

const ACTION_LABELS: Record<NearbyAction, string> = {
  talk: 'Conversar',
  read: 'Ler',
  enter: 'Entrar',
};
const KIT_IDS = Object.keys(GEAR) as GearId[];

/** Somente a visualização da bolsa; quantidades e propriedade vêm do motor. */
export interface BackpackItemView {
  readonly id: string;
  readonly kind: 'material' | 'potion' | 'food' | 'gear' | 'weapon';
  readonly name: string;
  readonly description: string;
  readonly symbol: string;
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
type InventoryTab = 'bag' | 'equipment';

@Injectable()
export class HudService implements GameUi {
  readonly status = signal('Preparando aventura…');
  readonly online = signal(false);
  readonly nearby = signal(0);
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
  readonly seed = signal(842136);
  readonly gel = signal(0);
  readonly potions = signal(0);
  readonly foodIds = FOOD_IDS;
  readonly foodCatalog = FOODS;
  readonly food = signal<FoodCounts>(emptyFoodCounts());
  readonly nutrition = signal<NutritionState>({ reserve: 0, elapsed: 0, cooldown: 0 });
  readonly inventoryAvailable = signal(true);
  readonly inventoryPending = signal(false);
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
      { id: 'gel', kind: 'material', name: 'Gel de slime', symbol: '◆', quantity: this.gel(),
        description: 'Recurso de troca com Lina e Toren na vila.' },
      { id: 'potion', kind: 'potion', name: 'Poção de cura', symbol: '✚', quantity: this.potions(),
        description: 'Recupera 35 HP imediatamente, sem ultrapassar a vida máxima.' },
    ];
    const food = this.food();
    for (const id of FOOD_IDS) {
      const item = FOODS[id];
      result.push({ id: 'food-' + id, kind: 'food', name: item.name, symbol: id === 'apple' ? '●' : id === 'bread' ? '▰' : '♨',
        quantity: food[id], foodId: id, description: 'Recupera até ' + item.healBudget + ' HP aos poucos.' });
    }
    const gear = this.gear();
    if (gear !== null) {
      for (const id of KIT_IDS) {
        const item = GEAR[id];
        if (gear[item.slot] === id) continue;
        const current = gear[item.slot];
        result.push({ id: 'gear-' + id, kind: 'gear', gearId: id, name: item.name,
          symbol: EQUIPMENT_SLOTS.find(slot => slot.id === item.slot)?.icon ?? '◈',
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
          symbol: '⚔', quantity: 1, damage: item.damage,
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
  readonly selectedBagItem = computed(() =>
    this.backpackItems().find(item => item.id === this.selectedBagId()) ?? null);
  readonly canUseSelectedBagItem = computed(() => {
    const item = this.selectedBagItem();
    if (!item || !this.inventoryAvailable() || this.inventoryPending() || this.hp() <= 0) return false;
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
  equippedName(slot: EquipmentSlot): string {
    if (slot === 'weapon') {
      const loadout = this.loadout();
      return loadout ? WEAPONS[loadout.equipped].name : '';
    }
    const id = this.gear()?.[slot];
    return id ? GEAR[id].name : '';
  }
  respawn(): void { this.respawnCallback(); }
  updateInventory(gel: number, potions: number, available: boolean, pending: boolean, food: FoodCounts): void {
    this.gel.set(gel); this.potions.set(potions); this.food.set(food);
    this.inventoryAvailable.set(available);
    this.inventoryPending.set(pending);
  }
  updateLoadout(loadout: WeaponLoadout | null): void { this.loadout.set(loadout); }
  updateGear(gear: GearState | null): void { this.gear.set(gear); }
  setInventoryFeedback(section: 'bag' | 'npc', message: string): void {
    (section === 'bag' ? this.inventoryFeedback : this.npcTradeFeedback).set(message);
  }
  setQuickPotionFeedback(message: string): void { this.quickPotionFeedback.set(message); }
  setStatus(status: string): void { this.status.set(status); }
  setTargetCombat(enabled: boolean): void { this.targetCombat.set(enabled); }
  setCombatTarget(label: string | null): void { this.combatTarget.set(label); }
  setOnline(online: boolean): void {
    this.online.set(online);
    this.inventoryFeedback.set('');
    this.quickPotionFeedback.set('');
    this.npcTradeFeedback.set('');
    this.npcOffer.set(null);
    this.selectedSlot.set('weapon');
    this.selectedBagId.set('potion');
    this.inventoryTab.set('bag');
    this.bagFilter.set('all');
  }
  setSeed(seed: number): void { this.seed.set(seed); }
  setPlayerCount(count: number, _online: boolean): void { this.nearby.set(count); }
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
    this.coords.set(`X ${hero.tileX} · Y ${hero.tileY}`);
  }
}
