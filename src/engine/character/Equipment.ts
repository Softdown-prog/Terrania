import type { HeroClassId } from "./classes/heroClass.ts";
import { APPRENTICE_GEAR } from "./mage/gear/apprentice.ts";

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

/** Uma peça de equipamento. Sem `heroClass`, é do Cavaleiro (o kit inicial); as roupas do Mago levam `heroClass: "mage"` (ADR 0078). */
export interface GearDefinition { slot: GearSlot; name: string; defense: number; heroClass?: HeroClassId; bonus?: GearBonusValues }

/** The initial kit is owned by every adventurer. The two swords keep their own acquisition rules. */
export const GEAR = {
  "copper-ring": { slot: "ring", name: "Anel de cobre", defense: 0 },
  "trail-helm": { slot: "head", name: "Elmo de trilha", defense: 1 },
  "river-pendant": { slot: "neck", name: "Pingente do rio", defense: 0 },
  "willow-shield": { slot: "shield", name: "Escudo de salgueiro", defense: 2 },
  "quilted-vest": { slot: "chest", name: "Peitoral acolchoado", defense: 1 },
  "canvas-pack": { slot: "backpack", name: "Mochila de lona", defense: 0 },
  "travel-trousers": { slot: "legs", name: "Calça de viagem", defense: 0 },
  "reed-arrows": { slot: "ammo", name: "Flechas de junco", defense: 0 },
  "trail-boots": { slot: "feet", name: "Botas de trilha", defense: 0 },
  ...APPRENTICE_GEAR,
} as const satisfies Record<string, GearDefinition>;

export type GearId = keyof typeof GEAR;
export type GearState = Readonly<Partial<Record<GearSlot, GearId>>>;
export type GearResult = "gear-equipped" | "gear-removed" | "gear-unchanged" | "wrong-slot" | "gear-wrong-class";

/** De quem é a peça: do Mago se assim marcada; o resto é do Cavaleiro. */
export function gearHeroClass(id: GearId): HeroClassId {
  const owner: HeroClassId | undefined = (GEAR[id] as GearDefinition).heroClass;
  return owner ?? "knight";
}

/** As peças que a vocação pode vestir, na ordem do catálogo. */
export function gearIdsFor(heroClass: HeroClassId): GearId[] {
  return (Object.keys(GEAR) as GearId[]).filter(id => gearHeroClass(id) === heroClass);
}

/** O que o Mago veste ao nascer: o conjunto do Aprendiz inteiro. O Cavaleiro nasce sem nada vestido. */
export const MAGE_STARTING_GEAR: GearState = Object.fromEntries(
  (Object.keys(APPRENTICE_GEAR) as Array<keyof typeof APPRENTICE_GEAR>).map(id => [APPRENTICE_GEAR[id].slot, id]));

/** Só fica o que é da vocação: um save com peças da outra vocação não as veste. */
export function gearForClass(gear: GearState, heroClass: HeroClassId): GearState {
  const kept: Partial<Record<GearSlot, GearId>> = {};
  for (const [slot, id] of Object.entries(gear))
    if (isGearSlot(slot) && isGearId(id) && gearHeroClass(id) === heroClass) kept[slot] = id;
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
