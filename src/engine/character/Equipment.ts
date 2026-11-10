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
} as const satisfies Record<string, { slot: GearSlot; name: string; defense: number }>;

export type GearId = keyof typeof GEAR;
export type GearState = Readonly<Partial<Record<GearSlot, GearId>>>;
export type GearResult = "gear-equipped" | "gear-removed" | "gear-unchanged" | "wrong-slot";

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
