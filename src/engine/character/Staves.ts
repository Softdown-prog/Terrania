import { APPRENTICE_STAFF } from "./weapons/staves/apprentice.ts";

/**
 * Catálogo dos cajados do Mago (ADR 0068). Por enquanto só o primeiro; os outros dez espelham as onze espadas, com um elemento cada,
 * e entram em lotes (fatia G do ADR 0065). Os números de combate são propostos e passam a valer na fatia D (o ataque à distância).
 */
export const STAFF_IDS = ["apprentice"] as const;
export type StaffId = typeof STAFF_IDS[number];
export const DEFAULT_STAFF: StaffId = "apprentice";
/** O elemento da magia do cajado; `null` é a magia arcana comum, sem efeito extra. */
export type StaffElement = "ice" | "fire" | "poison" | "lightning" | "astral";

/** Três tons de uma cor, do claro ao escuro. */
export interface StaffRamp { readonly light: string; readonly mid: string; readonly dark: string }
/** A aparência do cajado, declarativa e independente do Canvas: o renderizador lê esta ficha. */
export interface StaffVisualProfile {
  /** Matéria do cajado (os próximos terão gelo, magma, veneno, tempestade, astral...). */
  readonly motif: "oak";
  readonly shaft: StaffRamp;
  readonly wrap: string;
  readonly wrapDark: string;
  readonly ferrule: string;
  readonly ferruleLight: string;
  /** Anel de metal sob as garras e o fio de luz que corre pela madeira. */
  readonly collar: string;
  readonly collarDark: string;
  readonly sheen: string;
  readonly gem: StaffRamp & { readonly glow: string };
  /** Quantas garras de madeira seguram a gema. */
  readonly prongs: number;
  readonly ribbon: string;
  readonly ribbonDark: string;
}
export interface StaffDefinition {
  readonly name: string;
  readonly level: number;
  /** Dano da magia, antes da defesa do alvo. */
  readonly damage: number;
  /** Segundos entre uma magia e a próxima. */
  readonly interval: number;
  /** Segundos de preparo até a magia sair. */
  readonly windup: number;
  /** Mana gasta por magia. */
  readonly manaCost: number;
  /** Alcance da magia, em tiles. */
  readonly range: number;
  readonly element: StaffElement | null;
  readonly visual: StaffVisualProfile;
}

export const STAVES: Readonly<Record<StaffId, StaffDefinition>> = { apprentice: APPRENTICE_STAFF };

export function isStaffId(value: unknown): value is StaffId {
  return typeof value === "string" && STAFF_IDS.some(id => id === value);
}
/** O mago usa o cajado se o nível dele alcança o do cajado. */
export function staffUnlocked(staff: StaffId, level: number): boolean {
  return Number.isInteger(level) && level >= STAVES[staff].level;
}
