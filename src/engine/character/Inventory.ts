import { MAX_STACK } from "../Limits.ts";
export { MAX_STACK } from "../Limits.ts";
import { CREATURE_CATALOG, REGIONAL_CREATURE_KINDS } from "../../actors/CreatureCatalog.ts";
import { MOUNT_IDS, MOUNTS } from "../../actors/MountCatalog.ts";
import { aelaQuestProgress } from "../../world/aelaQuest.ts";
import type { Player } from "../../actors/Player.ts";
import { FOODS, emptyFoodCounts, normalizeFoodCounts, type FoodCounts, type FoodId,
  type FoodTradeResult, type FoodUseResult } from "./Food.ts";
import { nearestNpc } from "../../world/npcs.ts";
import { MAX_COINS, marketFor, materialSalePrice, normalizeCoins, type MarketId } from "./coins/index.ts";
import { ELIXIR_IDS, elixirRecipe, emptyElixirCounts, normalizeElixirs, type ElixirCounts, type ElixirCraftResult,
  type ElixirId, type ElixirUseResult } from "./south/alchemy/index.ts";
import { DEFAULT_BOW_LOADOUT, equipBowResult, isDefaultBowLoadout, normalizeBowLoadout, sanitizeBowLoadout, type BowEquipResult, type BowLoadout } from "./BowLoadout.ts";
import { DEFAULT_STAFF_LOADOUT, isDefaultStaffLoadout, normalizeStaffLoadout, sanitizeStaffLoadout, type StaffBuyResult, type StaffEquipResult, type StaffLoadout } from "./StaffLoadout.ts";
import { EMPTY_QUIVER, STARTING_QUIVER, addArrows, arrowRoom, sanitizeQuiver, selectArrow, spendArrows, type Quiver } from "./Quiver.ts";
import { ARROWS, ARROW_PACK, isArrowId, type ArrowId } from "./Arrows.ts";
import { STAVES, isStaffId, staffUnlocked, type StaffId } from "./Staves.ts";
import { FORGE_SWORD_PRICE, WEAPONS, isWeaponId, weaponUnlocked, type WeaponId, type WeaponLoadout } from "./Weapons.ts";
import { GEAR, gearDefense, gearForClass, gearForLevel, gearHeroClass, gearUnlocked, isGearId, isGearSlot, normalizeGear, startingGearFor, type GearId, type GearResult, type GearSlot, type GearState } from "./Equipment.ts";
import { DEFAULT_HERO_CLASS, type HeroClassId } from "./classes/index.ts";

/** Regras da bolsa do jogo solo (antes compartilhadas com a sala Node, já retirada). */
export const QUEST_REWARD_POTIONS = 2;
export const POTION_HEAL = 35;
export const POTION_GEL_PRICE = 3;
/** Descanso numa hospedaria (ADR 0022): cura toda a vida e limpa os status. Preço em Terrania Gold (ADR 0025). */
export const INN_REST_PRICE = 24;
export type PotionTradeResult = "traded" | "insufficient-gel" | "potions-full";
export type SwordPurchaseResult = "purchased" | "already-owned" | "insufficient-sword-coins" | "too-far-from-forge" | "unavailable";
export type InnRestResult = "rested" | "insufficient-rest-coins" | "too-far-from-inn" | "rest-not-needed";
/** `sold` = vendeu; os outros recusam sem mudar nada. */
export type MaterialSaleResult = "sold" | "not-sellable-here" | "no-material" | "wallet-full";
export type SwordEquipResult = "equipped" | "already-equipped" | "not-owned" | "level-too-low";
/** Tudo que uma ação da bolsa pode responder; a interface traduz cada valor em uma mensagem. */
/** O que a compra de flechas na Irmandade dos Arqueiros responde (ADR 0117); `arrows-bought` é a única que muda a bolsa. */
export type ArrowBuyResult = "arrows-bought" | "arrows-not-archer" | "arrows-quiver-full" | "arrows-insufficient-coins" | "arrows-too-far" | "arrows-unavailable";
export type ArrowEquipResult = "arrow-equipped" | "arrow-already-equipped" | "arrow-none" | "arrow-not-archer";
export type InventoryOutcome = ArrowBuyResult | ArrowEquipResult | BowEquipResult | PotionTradeResult | InnRestResult | MaterialSaleResult | SwordPurchaseResult | SwordEquipResult | StaffBuyResult | StaffEquipResult | GearResult |
  FoodTradeResult | FoodUseResult | ElixirCraftResult | ElixirUseResult | "healed" | "full-health" | "no-potion" | "too-far";

export interface InventoryState {
  gel: number;
  potion: number;
  questRewardClaimed: boolean;
  food?: FoodCounts;
  loadout?: WeaponLoadout;
  /** O cajado em mãos e os comprados do Mago (ADR 0073); ausente no padrão e no Cavaleiro. */
  staves?: StaffLoadout;
  /** A aljava do Arqueiro (ADR 0110): flechas por tipo e a que está em uso; ausente para as outras vocações. */
  quiver?: Quiver;
  /** O arco em mãos do Arqueiro (ADR 0120); ausente no padrão (Arco de Caça) e nas outras vocações. */
  bows?: BowLoadout;
  gear?: GearState;
  materials?: Record<string, number>;
  /** Dinheiro em Terrania Gold (ADR 0023); as moedas maiores saem da conta. Ausente quando é zero. */
  coins?: number;
  /** Elixires da Casa de Venenos (ADR 0030). Ausente quando não há nenhum. */
  elixirs?: Record<ElixirId, number>;
}

const KNOWN_MATERIALS = new Set([...REGIONAL_CREATURE_KINDS.flatMap(kind => CREATURE_CATALOG[kind].loot.map(item => item.item)),
  ...MOUNT_IDS.flatMap(id => MOUNTS[id].dropsOnTame.map(item => item.item))]);
export function normalizeMaterials(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [id, quantity] of Object.entries(value))
    if (KNOWN_MATERIALS.has(id) && typeof quantity === "number" &&
        Number.isSafeInteger(quantity) && quantity > 0) out[id] = Math.min(MAX_STACK, quantity);
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
  const staves = sanitizeStaffLoadout(state.staves);
  const bows = sanitizeBowLoadout(state.bows);
  const gear = normalizeGear(state.gear);
  const food = normalizeFoodCounts(state.food);
  const elixirs = normalizeElixirs(state.elixirs);
  return {
    gel: count(state.gel),
    potion: count(state.potion),
    questRewardClaimed: state.questRewardClaimed === true,
    ...(normalizeCoins(state.coins) > 0 ? { coins: normalizeCoins(state.coins) } : {}),
    ...(Object.values(food).some(v => v > 0) ? { food } : {}),
    ...(Object.values(elixirs).some(v => v > 0) ? { elixirs } : {}),
    ...(loadout ? { loadout } : {}),
    ...(isDefaultStaffLoadout(staves) ? {} : { staves }),
    ...(state.quiver === undefined ? {} : { quiver: sanitizeQuiver(state.quiver) }),
    ...(isDefaultBowLoadout(bows) ? {} : { bows }),
    ...(Object.keys(gear).length || hasGearRecord(state.gear) ? { gear } : {}),
    ...(Object.keys(normalizeMaterials(state.materials)).length ? { materials: normalizeMaterials(state.materials) } : {}),
  };
}

/** O save tem um registro de equipamento, mesmo vazio? O Mago que tirou tudo tem `gear: {}` e não volta a nascer vestido (ADR 0078). */
const hasGearRecord = (value: unknown): boolean => value !== null && typeof value === "object" && !Array.isArray(value);

export class Inventory {
  private gelCount = 0;
  private coinCount = 0;
  private materialCounts: Record<string, number> = {};
  private potionCount = 0;
  private foods: FoodCounts = emptyFoodCounts();
  private elixirCounts: Record<ElixirId, number> = emptyElixirCounts();
  private claimed = false;
  private weapons: WeaponLoadout;
  private staffLoadout: StaffLoadout = DEFAULT_STAFF_LOADOUT;
  private arrows: Quiver = EMPTY_QUIVER;
  private bowLoadout: BowLoadout = DEFAULT_BOW_LOADOUT;
  private equippedGear: GearState;
  private readonly heroClass: HeroClassId;

  constructor(value?: unknown, level = 1, heroClass: HeroClassId = DEFAULT_HERO_CLASS) {
    this.heroClass = heroClass;
    const state = normalizeInventory(value);
    this.gelCount = state.gel;
    this.coinCount = normalizeCoins(state.coins);
    this.materialCounts = normalizeMaterials(state.materials);
    this.potionCount = state.potion;
    this.foods = normalizeFoodCounts(state.food);
    this.elixirCounts = normalizeElixirs(state.elixirs);
    this.claimed = state.questRewardClaimed;
    const restored=state.loadout ?? { forged: false, equipped: "starter" };
    this.weapons = weaponUnlocked(restored.equipped, level, restored.forged)
      ? restored : { ...restored, equipped: "starter" };
    // Só vale o que é da vocação. O Mago sem registro de equipamento (mundo novo ou save antigo) nasce com o conjunto do Aprendiz e o Arqueiro, com o Couro Cru.
    // E só o que o nível já libera (ADR 0080).
    this.equippedGear = (state.gear === undefined ? startingGearFor(heroClass) : undefined) ?? gearForLevel(gearForClass(state.gear ?? {}, heroClass), level);
    this.staffLoadout = normalizeStaffLoadout(state.staves, level);
    this.bowLoadout = heroClass === "archer" ? normalizeBowLoadout(state.bows, level) : DEFAULT_BOW_LOADOUT;
    // Só o Arqueiro tem aljava; sem registro (mundo novo ou save antigo) ele começa com as 30 flechas de junco.
    this.arrows = heroClass !== "archer" ? EMPTY_QUIVER : state.quiver === undefined ? STARTING_QUIVER : sanitizeQuiver(state.quiver);
  }

  get gel(): number { return this.gelCount; }
  /** Dinheiro em Terrania Gold; `coinBreakdown` mostra como as moedas se juntam. */
  get coins(): number { return this.coinCount; }
  /** Ganha moedas (Terrania Gold). Devolve quantas couberam: a carteira tem teto e nunca perde o resto à força. */
  addCoins(amount: number): number {
    if (!Number.isSafeInteger(amount) || amount <= 0) return 0;
    const added = Math.min(amount, MAX_COINS - this.coinCount);
    this.coinCount += added;
    return added;
  }
  /** Paga em moedas, dando o troco sozinho. Atômico: sem dinheiro suficiente nada muda. */
  spendCoins(amount: number): boolean {
    if (!Number.isSafeInteger(amount) || amount <= 0 || this.coinCount < amount) return false;
    this.coinCount -= amount;
    return true;
  }
  get materials(): Readonly<Record<string, number>> { return { ...this.materialCounts }; }
  /**
   * Vende `quantity` unidades de um material a uma banca (ADR 0026) e paga em moedas. Atômico: só vende
   * o que esta banca compra, o que o herói tem, e se a carteira comporta o total.
   */
  sellMaterial(market: MarketId, material: string, quantity: number): { result: MaterialSaleResult; coins: number; sold: number } {
    const refused = (result: MaterialSaleResult) => ({ result, coins: 0, sold: 0 });
    const price = materialSalePrice(material);
    if (price === null || marketFor(material) !== market) return refused("not-sellable-here");
    const owned = this.materialCounts[material] ?? 0;
    if (!Number.isSafeInteger(quantity) || quantity < 1 || owned < 1) return refused("no-material");
    const sold = Math.min(quantity, owned), total = price * sold;
    if (MAX_COINS - this.coinCount < total) return refused("wallet-full");
    this.addCoins(total);
    if (owned - sold > 0) this.materialCounts[material] = owned - sold; else delete this.materialCounts[material];
    return { result: "sold", coins: total, sold };
  }
  /** Gasta `quantity` de um material. Atômico: sem o suficiente nada muda. */
  spendMaterial(id: string, quantity: number): boolean {
    const owned = this.materialCounts[id] ?? 0;
    if (!Number.isSafeInteger(quantity) || quantity < 1 || owned < quantity) return false;
    if (owned - quantity > 0) this.materialCounts[id] = owned - quantity; else delete this.materialCounts[id];
    return true;
  }
  /** Se `addMaterial(id)` daria certo agora (material conhecido e a pilha ainda tem lugar). */
  canAddMaterial(id: string): boolean { return KNOWN_MATERIALS.has(id) && (this.materialCounts[id] ?? 0) < MAX_STACK; }
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
  get elixirs(): ElixirCounts { return { ...this.elixirCounts }; }
  get questRewardClaimed(): boolean { return this.claimed; }
  get hasRoomForGel(): boolean { return this.gelCount < MAX_STACK; }
  get loadout(): WeaponLoadout { return this.weapons; }
  /** O cajado em mãos e os comprados (ADR 0073). */
  get staves(): StaffLoadout { return this.staffLoadout; }
  get bows(): BowLoadout { return this.bowLoadout; }
  /** A aljava do Arqueiro (vazia para as outras vocações). */
  get quiver(): Quiver { return this.arrows; }
  /** Gasta flechas da que está em uso, tudo ou nada (ADR 0110). */
  spendArrows(amount: number): boolean {
    const next = this.heroClass === "archer" ? spendArrows(this.arrows, amount) : null;
    if (!next) return false;
    this.arrows = next;
    return true;
  }
  /**
   * Compra um pacote de flechas (ADR 0117): `ARROW_PACK` do tipo, ou só o que cabe na aljava (cada flecha custa o preço dela), e o herói precisa estar de pé. Só o
   * Arqueiro tem aljava. Sem moedas para o que cabe, nada muda.
   */
  buyArrows(id: ArrowId, hero: { hp: number }): ArrowBuyResult {
    if (this.heroClass !== "archer" || !isArrowId(id)) return "arrows-not-archer";
    if (hero.hp <= 0) return "arrows-unavailable";
    const amount = Math.min(ARROW_PACK, arrowRoom(this.arrows, id));
    if (amount < 1) return "arrows-quiver-full";
    if (!this.spendCoins(ARROWS[id].price * amount)) return "arrows-insufficient-coins";
    this.arrows = addArrows(this.arrows, id, amount).quiver;
    return "arrows-bought";
  }
  /** Muda a flecha em uso (só para um tipo de que há flechas); só o Arqueiro (ADR 0117). */
  equipArrow(id: ArrowId): ArrowEquipResult {
    if (this.heroClass !== "archer") return "arrow-not-archer";
    const next = selectArrow(this.arrows, id);
    if (!next) return "arrow-none";
    if (next === this.arrows) return "arrow-already-equipped";
    this.arrows = next;
    return "arrow-equipped";
  }
  /** Põe flechas na aljava até o máximo do tipo; devolve quantas entraram (0 para quem não é Arqueiro). */
  gainArrows(id: ArrowId, amount: number): number {
    if (this.heroClass !== "archer") return 0;
    const result = addArrows(this.arrows, id, amount);
    this.arrows = result.quiver;
    return result.added;
  }
  get weapon() { return WEAPONS[this.weapons.equipped]; }
  get gear(): GearState { return this.equippedGear; }
  get defense(): number { return gearDefense(this.equippedGear); }

  /** Veste (ou tira, com `null`) uma peça: tem de ser do espaço e da vocação, e o `level` do herói tem de liberar a peça (ADR 0080). */
  equipGear(slot: GearSlot, item: GearId | null, level: number): GearResult {
    if (!isGearSlot(slot) || (item !== null && (!isGearId(item) || GEAR[item].slot !== slot))) return "wrong-slot";
    if (item !== null && gearHeroClass(item) !== this.heroClass) return "gear-wrong-class";
    if (item !== null && !gearUnlocked(item, level)) return "gear-level-too-low";
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

  /** Paga o descanso: vida cheia e sem status. Não cobra se o herói já está bem. */
  restAtInn(hero: { hp: number; maxHp: number; cleanse?: () => void; debuffs?: Readonly<Record<string, number>> }): InnRestResult {
    if (!Number.isFinite(hero.hp) || !Number.isFinite(hero.maxHp) || hero.hp <= 0) return "rest-not-needed";
    const afflicted = Object.values(hero.debuffs ?? {}).some(seconds => seconds > 0);
    if (hero.hp >= hero.maxHp && !afflicted) return "rest-not-needed";
    if (!this.spendCoins(INN_REST_PRICE)) return "insufficient-rest-coins";
    hero.hp = hero.maxHp;
    hero.cleanse?.();
    return "rested";
  }

  /** Compra um alimento com moedas (ADR 0025). */
  buyFood(id: FoodId): FoodTradeResult {
    if (this.foods[id] >= MAX_STACK) return "food-stack-full";
    if (!this.spendCoins(FOODS[id].price)) return "insufficient-food-coins";
    this.foods[id]++;
    return "food-traded";
  }
  useFood(id: FoodId, hero: Player): FoodUseResult {
    if (this.foods[id] < 1) return "no-food";
    const outcome = hero.eatFood(id);
    if (outcome === "ate") this.foods[id]--;
    return outcome;
  }
  /**
   * Prepara um elixir (ADR 0030): gasta os ingredientes e as moedas e entrega o frasco. Atômico: se faltar
   * ingrediente ou dinheiro, ou a pilha estiver cheia, nada muda. Quem chama garante que está com Ixtal.
   */
  craftElixir(id: ElixirId): ElixirCraftResult {
    const recipe = elixirRecipe(id);
    if (this.elixirCounts[id] >= MAX_STACK) return "elixir-stack-full";
    if (recipe.ingredients.some(({ material, quantity }) => (this.materialCounts[material] ?? 0) < quantity))
      return "missing-ingredients";
    if (!this.spendCoins(recipe.price)) return "insufficient-elixir-coins";
    for (const { material, quantity } of recipe.ingredients) {
      const left = (this.materialCounts[material] ?? 0) - quantity;
      if (left > 0) this.materialCounts[material] = left; else delete this.materialCounts[material];
    }
    this.elixirCounts[id]++;
    return "elixir-crafted";
  }
  /** Usa um elixir. Sem efeito (vida cheia, ou sem nenhum mal) não gasta o frasco. */
  useElixir(id: ElixirId, hero: { hp: number; maxHp: number; cleanse?: () => void; debuffs?: Readonly<Record<string, number>> }): ElixirUseResult {
    if (!ELIXIR_IDS.includes(id) || this.elixirCounts[id] < 1) return "no-elixir";
    if (!Number.isFinite(hero.hp) || !Number.isFinite(hero.maxHp) || hero.hp <= 0) return "elixir-no-effect";
    const { effect } = elixirRecipe(id);
    if (effect.kind === "heal") {
      if (hero.hp >= hero.maxHp) return "elixir-no-effect";
      hero.hp = Math.min(hero.maxHp, hero.hp + effect.amount);
    } else {
      if (!Object.values(hero.debuffs ?? {}).some(seconds => seconds > 0)) return "elixir-no-effect";
      hero.cleanse?.();
    }
    this.elixirCounts[id]--;
    return "elixir-used";
  }
  buyForgeSword(hero: { x: number; y: number; hp: number }): SwordPurchaseResult {
    if (hero.hp <= 0) return "unavailable";
    if (nearestNpc(hero.x, hero.y)?.id !== "toren") return "too-far-from-forge";
    if (this.weapons.forged) return "already-owned";
    if (!this.spendCoins(FORGE_SWORD_PRICE)) return "insufficient-sword-coins";
    this.weapons = { ...this.weapons, forged: true };
    return "purchased";
  }

  equipWeapon(weapon: WeaponId, level: number): SwordEquipResult {
    if (!isWeaponId(weapon)) return "not-owned";
    if (weapon === this.weapons.equipped) return "already-equipped";
    // A espada de Toren requer compra antes de validar seu nível de uso.
    if (weapon === "forge" && !this.weapons.forged) return "not-owned";
    if (!Number.isInteger(level) || level < WEAPONS[weapon].level) return "level-too-low";
    if (!weaponUnlocked(weapon,level,this.weapons.forged)) return "not-owned";
    this.weapons = { ...this.weapons, equipped: weapon };
    return "equipped";
  }

  /** Compra um cajado vendido na Academia Arcana (o preço é o da ficha); quem confere a distância da Academia é a ação de loja. */
  buyStaff(staff: StaffId, hero: { hp: number }): StaffBuyResult {
    if (hero.hp <= 0) return "staff-unavailable";
    const price = isStaffId(staff) ? STAVES[staff].price : undefined;
    if (price === undefined) return "staff-not-for-sale";
    if (this.staffLoadout.bought.includes(staff)) return "staff-already-owned";
    if (!this.spendCoins(price)) return "staff-insufficient-coins";
    this.staffLoadout = { ...this.staffLoadout, bought: [...this.staffLoadout.bought, staff] };
    return "staff-purchased";
  }

  /** Troca o cajado em mãos: precisa do nível dele e, se é vendido, de tê-lo comprado. */
  /** Troca o arco em mãos do Arqueiro (ADR 0120): precisa existir e o nível alcançar o dele. */
  equipBow(bow: unknown, level: number): BowEquipResult {
    if (this.heroClass !== "archer") return "bow-unknown";
    const { result, loadout } = equipBowResult(this.bowLoadout, bow, level);
    this.bowLoadout = loadout;
    return result;
  }

  equipStaff(staff: StaffId, level: number): StaffEquipResult {
    if (!isStaffId(staff)) return "staff-not-owned";
    if (staff === this.staffLoadout.equipped) return "staff-already-equipped";
    if (!Number.isInteger(level) || level < STAVES[staff].level) return "staff-level-too-low";
    if (!staffUnlocked(staff, level, this.staffLoadout.bought)) return "staff-not-owned";
    this.staffLoadout = { ...this.staffLoadout, equipped: staff };
    return "staff-equipped";
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
      ...(this.coinCount > 0 ? { coins: this.coinCount } : {}),
      ...(Object.values(this.foods).some(v => v > 0) ? { food: { ...this.foods } } : {}),
      ...(Object.values(this.elixirCounts).some(v => v > 0) ? { elixirs: { ...this.elixirCounts } } : {}),
      ...(this.weapons.forged || this.weapons.equipped !== "starter" ? { loadout: this.weapons } : {}),
      ...(isDefaultStaffLoadout(this.staffLoadout) ? {} : { staves: this.staffLoadout }),
      ...(this.heroClass === "archer" ? { quiver: this.arrows } : {}),
      ...(this.heroClass === "archer" && !isDefaultBowLoadout(this.bowLoadout) ? { bows: this.bowLoadout } : {}),
      ...(Object.keys(this.equippedGear).length || startingGearFor(this.heroClass) !== undefined ? { gear: this.equippedGear } : {}),
      ...(Object.keys(this.materialCounts).length ? { materials: { ...this.materialCounts } } : {}),
    };
  }
}
