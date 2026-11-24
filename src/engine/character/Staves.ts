import { APPRENTICE_STAFF } from "./weapons/staves/apprentice.ts";
import { BREEZE_STAFF } from "./weapons/staves/breeze.ts";
import { STONE_STAFF } from "./weapons/staves/stone.ts";
import { TIDE_STAFF } from "./weapons/staves/tide.ts";

/**
 * Catálogo dos cajados do Mago (ADR 0068, lista em `docs/MAGO_CAJADOS.md`). O Aprendiz é o primeiro; os outros dez espelham as espadas,
 * com um elemento cada, e entram em lotes (fatia G do ADR 0065): o lote 1 traz a Brisa, a Rocha Viva e as Marés (ADR 0073).
 */
export const STAFF_IDS = ["apprentice", "breeze", "stone", "tide"] as const;
export type StaffId = typeof STAFF_IDS[number];
export const DEFAULT_STAFF: StaffId = "apprentice";
/** O elemento da magia do cajado; `null` é a magia arcana comum, sem efeito extra. */
export type StaffElement = "wind" | "earth" | "water" | "ice" | "fire" | "poison" | "lightning" | "astral";

/**
 * O efeito extra da magia, além do dano (ADR 0073): empurra o alvo `distance` pixels para longe do herói; deixa o alvo mais lento
 * (`factor` é a velocidade que sobra, de 0 a 1) por `seconds`; ou devolve ao herói `percent`% do dano causado em vida.
 */
export type StaffEffect =
  | { readonly kind: "push"; readonly distance: number }
  | { readonly kind: "slow"; readonly factor: number; readonly seconds: number }
  | { readonly kind: "heal"; readonly percent: number };

/** Três tons de uma cor, do claro ao escuro. */
export interface StaffRamp { readonly light: string; readonly mid: string; readonly dark: string }
/** A aparência do cajado, declarativa e independente do Canvas: o renderizador lê esta ficha. */
export interface StaffVisualProfile {
  /** Matéria do cajado: o carvalho do Aprendiz, a pena do vento, a rocha da terra, o coral da água (os próximos lotes trazem as outras). */
  readonly motif: "oak" | "feather" | "stone" | "coral";
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
  /** O efeito extra da magia; `null` é só dano. */
  readonly effect: StaffEffect | null;
  /** Preço em Terrania Gold se o cajado precisa ser comprado na Academia Arcana antes de ser usado; sem preço, libera só pelo nível. */
  readonly price?: number;
  readonly visual: StaffVisualProfile;
}

export const STAVES: Readonly<Record<StaffId, StaffDefinition>> = { apprentice: APPRENTICE_STAFF, breeze: BREEZE_STAFF, stone: STONE_STAFF, tide: TIDE_STAFF };

export function isStaffId(value: unknown): value is StaffId {
  return typeof value === "string" && STAFF_IDS.some(id => id === value);
}
/** O mago usa o cajado se o nível dele alcança o do cajado e, quando o cajado é vendido, se ele já foi comprado. */
export function staffUnlocked(staff: StaffId, level: number, bought: readonly StaffId[] = []): boolean {
  return Number.isInteger(level) && level >= STAVES[staff].level && (STAVES[staff].price === undefined || bought.includes(staff));
}
