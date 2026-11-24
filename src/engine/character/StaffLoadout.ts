import { DEFAULT_STAFF, STAFF_IDS, STAVES, isStaffId, staffUnlocked, type StaffId } from "./Staves.ts";

/**
 * O cajado em mãos e os cajados já comprados do Mago (ADR 0073), como o `WeaponLoadout` é das espadas. Só entram em `bought` os cajados
 * que a Academia Arcana vende (os com preço); os outros liberam sozinhos no nível. Fica no save da bolsa só quando difere do padrão.
 */
export interface StaffLoadout {
  readonly equipped: StaffId;
  readonly bought: readonly StaffId[];
}
export const DEFAULT_STAFF_LOADOUT: StaffLoadout = { equipped: DEFAULT_STAFF, bought: [] };

export type StaffBuyResult = "staff-purchased" | "staff-already-owned" | "staff-not-for-sale" | "staff-insufficient-coins" | "staff-too-far" | "staff-unavailable";
export type StaffEquipResult = "staff-equipped" | "staff-already-equipped" | "staff-not-owned" | "staff-level-too-low";

/** O formato do save, sem saber o nível: só ids que existem entram, os comprados só se são vendidos, sem repetir e na ordem do catálogo. */
export function sanitizeStaffLoadout(value: unknown): StaffLoadout {
  if (!value || typeof value !== "object") return DEFAULT_STAFF_LOADOUT;
  const raw = value as { equipped?: unknown; bought?: unknown };
  const list = Array.isArray(raw.bought) ? raw.bought : [];
  return { equipped: isStaffId(raw.equipped) ? raw.equipped : DEFAULT_STAFF, bought: STAFF_IDS.filter(id => STAVES[id].price !== undefined && list.includes(id)) };
}

/** O que a simulação aceita do save: além do formato, o cajado em mãos precisa estar liberado para o nível do mago (e comprado, se é vendido). */
export function normalizeStaffLoadout(value: unknown, level: number): StaffLoadout {
  const clean = sanitizeStaffLoadout(value);
  return staffUnlocked(clean.equipped, level, clean.bought) ? clean : { ...clean, equipped: DEFAULT_STAFF };
}

export const isDefaultStaffLoadout = (loadout: StaffLoadout): boolean => loadout.equipped === DEFAULT_STAFF && loadout.bought.length === 0;
