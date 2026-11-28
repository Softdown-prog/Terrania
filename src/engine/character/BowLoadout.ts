import { BOWS, DEFAULT_BOW, isBowId, bowUnlocked, type BowId } from "./Bows.ts";

/**
 * O arco em mãos do Arqueiro (ADR 0120), como o `StaffLoadout` é dos cajados. Os arcos liberam sozinhos no nível (ainda não há loja de arcos),
 * então só o arco em uso entra no save, e só quando difere do padrão.
 */
export interface BowLoadout {
  readonly equipped: BowId;
}
export const DEFAULT_BOW_LOADOUT: BowLoadout = { equipped: DEFAULT_BOW };

export type BowEquipResult = "bow-equipped" | "bow-already-equipped" | "bow-level-too-low" | "bow-unknown";

/** O formato do save, sem saber o nível: só um id que existe vale. */
export function sanitizeBowLoadout(value: unknown): BowLoadout {
  if (!value || typeof value !== "object") return DEFAULT_BOW_LOADOUT;
  const raw = value as { equipped?: unknown };
  return isBowId(raw.equipped) ? { equipped: raw.equipped } : DEFAULT_BOW_LOADOUT;
}

/** O que a simulação aceita do save: o arco em mãos precisa estar liberado para o nível do Arqueiro. */
export function normalizeBowLoadout(value: unknown, level: number): BowLoadout {
  const clean = sanitizeBowLoadout(value);
  return bowUnlocked(clean.equipped, level) ? clean : DEFAULT_BOW_LOADOUT;
}

export const isDefaultBowLoadout = (loadout: BowLoadout): boolean => loadout.equipped === DEFAULT_BOW;

/** Troca o arco: precisa existir e o nível alcançar o dele. */
export function equipBowResult(current: BowLoadout, bow: unknown, level: number): { result: BowEquipResult; loadout: BowLoadout } {
  if (!isBowId(bow)) return { result: "bow-unknown", loadout: current };
  if (bow === current.equipped) return { result: "bow-already-equipped", loadout: current };
  if (!Number.isInteger(level) || level < BOWS[bow].level) return { result: "bow-level-too-low", loadout: current };
  return { result: "bow-equipped", loadout: { equipped: bow } };
}
