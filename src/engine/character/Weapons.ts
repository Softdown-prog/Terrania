import { STARTER_SWORD } from "./weapons/swords/starter.ts";
import { FORGE_SWORD } from "./weapons/swords/forge.ts";
import { BRONZE_SWORD } from "./weapons/swords/bronze.ts";
import { COPPER_SWORD } from "./weapons/swords/copper.ts";
import { DUNES_SWORD } from "./weapons/swords/dunes.ts";
import { BOREAL_SWORD } from "./weapons/swords/boreal.ts";
import { OBSIDIAN_SWORD } from "./weapons/swords/obsidian.ts";
import { MARSH_SWORD } from "./weapons/swords/marsh.ts";
import { TEMPEST_SWORD } from "./weapons/swords/tempest.ts";
import { ASTRAL_SWORD } from "./weapons/swords/astral.ts";

/** Catalog for the Knight's ten illustrated sword tiers. The legacy `forge`
 * ID is deliberately reused as iron, so preexisting saved purchases survive. */
export const WEAPON_IDS = ["starter","forge","bronze","copper","dunes","boreal","obsidian","marsh","tempest","astral"] as const;
export type WeaponId = typeof WEAPON_IDS[number];
export type SwordSpecial = "push" | "bleed" | "ice" | "fire" | "poison" | "lightning" | "astral";
/** Visual de cada arma, declarativo e independente do Canvas.
 * O renderizador lê esta ficha, sem cadastrar geometrias em paralelo. */
export interface SwordVisualProfile {
  /** Silhueta e tratamento de material, definidos na ficha da espada. */
  readonly motif: "oak" | "iron" | "bronze" | "copper" | "dunes" |
    "frost" | "magma" | "venom" | "storm" | "astral";
  readonly accent: string;
  readonly trim: string;
  readonly blade: string;
  readonly shade: string;
  readonly glint: string;
  readonly guard: string;
  readonly grip: string;
  readonly width: number;
  readonly length: number;
  readonly serrated?: boolean;
  readonly broad?: boolean;
  readonly curved?: boolean;
  readonly rune?: boolean;
  readonly wrapColor?: string;
  readonly pommelRadius?: number;
  readonly pommelRing?: boolean;
  readonly guardReach?: number;
  readonly wingedGuard?: boolean;
  readonly wingColor?: string;
  readonly runeColor?: string;
  readonly ornament?: "magma" | "venom" | "stars" | "storm";
  readonly trailAccent?: "particles" | "bolts" | "stars";
  readonly trailLineWidth?: number;
}
export interface WeaponDefinition {
  readonly name: string;
  readonly level: number;
  readonly damage: number;
  readonly interval: number;
  readonly windup: number;
  readonly nature: "physical" | "hybrid";
  readonly special: SwordSpecial | null;
  readonly visual: SwordVisualProfile;
  readonly trail: { readonly first: string; readonly second: string; readonly opacity: number };
}

export interface WeaponLoadout {
  readonly forged: boolean;
  readonly equipped: WeaponId;
}

/** Catálogo canônico composto pelas dez fichas individuais em weapons/swords.
 * Mantém IDs estáveis, progressão e compatibilidade do save. */
export const WEAPONS: Readonly<Record<WeaponId, WeaponDefinition>> = {
  starter: STARTER_SWORD,
  forge: FORGE_SWORD,
  bronze: BRONZE_SWORD,
  copper: COPPER_SWORD,
  dunes: DUNES_SWORD,
  boreal: BOREAL_SWORD,
  obsidian: OBSIDIAN_SWORD,
  marsh: MARSH_SWORD,
  tempest: TEMPEST_SWORD,
  astral: ASTRAL_SWORD,
};

/** Tier 0 means a new player starts with this sword (the existing player level starts at 1). */
export const FORGE_SWORD_PRICE = 5;
export function isWeaponId(value: unknown): value is WeaponId {
  return typeof value === "string" && WEAPON_IDS.some(id => id === value);
}
export function weaponUnlocked(weapon: WeaponId, level: number, forged: boolean): boolean {
  return Number.isInteger(level) && level >= WEAPONS[weapon].level &&
    (weapon !== "forge" || forged);
}
