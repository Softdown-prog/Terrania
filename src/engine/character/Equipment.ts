import type { HeroClassId } from "./classes/heroClass.ts";
import { KNIGHT_GEAR } from "./knight/gear/index.ts";
import { APPRENTICE_GEAR } from "./mage/gear/apprentice/index.ts";
import { BREEZE_GEAR } from "./mage/gear/breeze/index.ts";
import { LEATHER_GEAR } from "./archer/gear/leather/index.ts";

export const EQUIPMENT_SLOTS = [
  { id: "ring", label: "Anel", icon: "◈" },
  { id: "head", label: "Elmo", icon: "◒" },
  { id: "neck", label: "Colar", icon: "◇" },
  { id: "shield", label: "Escudo", icon: "⬟" },
  { id: "chest", label: "Peitoral", icon: "▣" },
  { id: "weapon", label: "Espada", icon: "⚔" },
  { id: "backpack", label: "Mochila", icon: "▤" },
  { id: "legs", label: "Calça", icon: "Ⅱ" },
  { id: "ammo", label: "Flechas", icon: "➶" },
  { id: "feet", label: "Botas", icon: "▰" },
] as const;

export type EquipmentSlot = typeof EQUIPMENT_SLOTS[number]["id"];
export type GearSlot = Exclude<EquipmentSlot, "weapon">;

/** Os bônus de uma peça (ADR 0079), em porcentagem inteira: mana máxima, recarga de mana e dano das magias. Sem o campo, a peça não dá bônus. */
export interface GearBonusValues { mana?: number; regen?: number; damage?: number }

/**
 * Uma peça de equipamento. Sem `heroClass`, é do Cavaleiro (o kit inicial); as roupas do Mago levam `heroClass: "mage"` (ADR 0078) e as do Arqueiro `heroClass: "archer"` (ADR 0123). `level` é o nível
 * que libera a peça (sem o campo, vale desde o nível 1) e `set` o nome do conjunto a que pertence, para a tela (ADR 0080).
 */
export interface GearDefinition { slot: GearSlot; name: string; defense: number; heroClass?: HeroClassId; bonus?: GearBonusValues; level?: number; set?: string }

/** O kit inicial do Cavaleiro e as roupas de cada conjunto do Mago; cada peça mora no seu arquivo. (Espadas e cajados têm o catálogo e as regras de aquisição deles.) */
export const GEAR = {
  ...KNIGHT_GEAR,
  ...APPRENTICE_GEAR,
  ...BREEZE_GEAR,
  ...LEATHER_GEAR,
} as const satisfies Record<string, GearDefinition>;

export type GearId = keyof typeof GEAR;
export type GearState = Readonly<Partial<Record<GearSlot, GearId>>>;
export type GearResult = "gear-equipped" | "gear-removed" | "gear-unchanged" | "wrong-slot" | "gear-wrong-class" | "gear-level-too-low";

/** De quem é a peça: do Mago se assim marcada; o resto é do Cavaleiro. */
export function gearHeroClass(id: GearId): HeroClassId {
  const owner: HeroClassId | undefined = (GEAR[id] as GearDefinition).heroClass;
  return owner ?? "knight";
}

/** As peças que a vocação pode vestir, na ordem do catálogo. */
export function gearIdsFor(heroClass: HeroClassId): GearId[] {
  return (Object.keys(GEAR) as GearId[]).filter(id => gearHeroClass(id) === heroClass);
}

/** O nível que libera a peça (1 para as que não pedem nível, como o kit inicial). */
export function gearLevel(id: GearId): number {
  return (GEAR[id] as GearDefinition).level ?? 1;
}

/** A peça já pode ser vestida neste nível? Como as espadas e os cajados, libera sozinha ao chegar no nível (ADR 0080). */
export function gearUnlocked(id: GearId, level: number): boolean {
  return Number.isInteger(level) && level >= gearLevel(id);
}

/** O nome do conjunto da peça para a tela (o kit do Cavaleiro é o "inicial"). */
export function gearSetName(id: GearId): string {
  return (GEAR[id] as GearDefinition).set ?? "inicial";
}

/** O que o Mago veste ao nascer: o conjunto do Aprendiz inteiro. O Cavaleiro nasce sem nada vestido. */
export const MAGE_STARTING_GEAR: GearState = Object.fromEntries(
  (Object.keys(APPRENTICE_GEAR) as Array<keyof typeof APPRENTICE_GEAR>).map(id => [APPRENTICE_GEAR[id].slot, id]));

/** O que o Arqueiro veste ao nascer: o conjunto Couro Cru inteiro (ADR 0123). */
export const ARCHER_STARTING_GEAR: GearState = Object.fromEntries(
  (Object.keys(LEATHER_GEAR) as Array<keyof typeof LEATHER_GEAR>).map(id => [LEATHER_GEAR[id].slot, id]));

/** O que a vocação veste ao nascer, sem registro de equipamento no save: o conjunto do Mago ou o do Arqueiro; o Cavaleiro nasce sem nada (`undefined`). */
export function startingGearFor(heroClass: HeroClassId): GearState | undefined {
  return heroClass === "mage" ? MAGE_STARTING_GEAR : heroClass === "archer" ? ARCHER_STARTING_GEAR : undefined;
}

/** Só fica o que é da vocação: um save com peças da outra vocação não as veste. */
export function gearForClass(gear: GearState, heroClass: HeroClassId): GearState {
  const kept: Partial<Record<GearSlot, GearId>> = {};
  for (const [slot, id] of Object.entries(gear))
    if (isGearSlot(slot) && isGearId(id) && gearHeroClass(id) === heroClass) kept[slot] = id;
  return kept;
}

/** Só fica vestido o que o nível já libera: um save com peça de nível alto demais não a veste. */
export function gearForLevel(gear: GearState, level: number): GearState {
  const kept: Partial<Record<GearSlot, GearId>> = {};
  for (const [slot, id] of Object.entries(gear))
    if (isGearSlot(slot) && isGearId(id) && gearUnlocked(id, level)) kept[slot] = id;
  return kept;
}

export function isGearSlot(value: unknown): value is GearSlot {
  return value !== "weapon" && EQUIPMENT_SLOTS.some(slot => slot.id === value);
}

export function isGearId(value: unknown): value is GearId {
  return typeof value === "string" && Object.hasOwn(GEAR, value);
}

export function normalizeGear(value: unknown): GearState {
  const gear: Partial<Record<GearSlot, GearId>> = {};
  if (!value || typeof value !== "object") return gear;
  for (const [slot, item] of Object.entries(value)) {
    if (isGearSlot(slot) && isGearId(item) && GEAR[item].slot === slot) gear[slot] = item;
  }
  return gear;
}

export function gearDefense(gear: GearState): number {
  return Object.values(gear).reduce((total, id) => total + GEAR[id].defense, 0);
}
