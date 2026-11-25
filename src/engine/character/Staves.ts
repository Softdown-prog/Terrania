import { APPRENTICE_STAFF } from "./weapons/staves/apprentice.ts";
import { BREEZE_STAFF } from "./weapons/staves/breeze.ts";
import { STONE_STAFF } from "./weapons/staves/stone.ts";
import { TIDE_STAFF } from "./weapons/staves/tide.ts";
import { EMBER_STAFF } from "./weapons/staves/ember.ts";
import { THORN_STAFF } from "./weapons/staves/thorn.ts";
import { FROST_STAFF } from "./weapons/staves/frost.ts";
import { SUN_STAFF } from "./weapons/staves/sun.ts";
import { MOON_STAFF } from "./weapons/staves/moon.ts";
import { STORM_STAFF } from "./weapons/staves/storm.ts";
import { ASTRAL_STAFF } from "./weapons/staves/astral.ts";

/**
 * Catálogo dos cajados do Mago (ADR 0068, lista em `docs/MAGO_CAJADOS.md`). O Aprendiz é o primeiro; os outros dez espelham as espadas,
 * com um elemento cada, e entram em lotes (fatia G do ADR 0065): o lote 1 traz a Brisa, a Rocha Viva e as Marés (ADR 0073) e o lote 2 a Brasa Rubra, o Espinheiro e a Geada Boreal (ADR 0075) o lote 3 o Sol Nascente, a Lua Negra e a Tempestade (ADR 0076) e o lote 4 o Astral (ADR 0077), que completa os onze.
 */
export const STAFF_IDS = ["apprentice", "breeze", "stone", "tide", "ember", "thorn", "frost", "sun", "moon", "storm", "astral"] as const;
export type StaffId = typeof STAFF_IDS[number];
export const DEFAULT_STAFF: StaffId = "apprentice";
/** O elemento da magia do cajado; `null` é a magia arcana comum, sem efeito extra. */
export type StaffElement = "wind" | "earth" | "water" | "nature" | "ice" | "fire" | "poison" | "lightning" | "light" | "shadow" | "astral";

/**
 * O efeito extra da magia, além do dano (ADR 0073): empurra o alvo `distance` pixels para longe do herói; deixa o alvo mais lento
 * (`factor` é a velocidade que sobra, de 0 a 1) por `seconds`; devolve ao herói `percent`% do dano causado em vida; queima o alvo
 * (`damage` por segundo durante `seconds`); ou envenena o alvo (`damage` por segundo e por acúmulo, durante `seconds`, com até `maxStacks`
 * acúmulos). Queimadura e veneno não passam pela defesa do alvo (dano ao longo do tempo). O feixe (`pierce`) atravessa o alvo e atinge também até
 * `extra` monstros atrás dele, com o mesmo dano; a sombra (`leech`) devolve ao herói `percent`% do dano causado em mana; o raio (`chain`) salta do alvo
 * para até `jumps` vizinhos (cada um a até `radius` pixels do anterior, sem parede no meio), cada salto com `percent`% do dano; o astral (`nova`)
 * acerta o alvo e os `neighbors` monstros mais perto **dele** (até `radius` pixels do alvo, sem parede no meio), todos com o dano inteiro.
 */
export type StaffEffect =
  | { readonly kind: "push"; readonly distance: number }
  | { readonly kind: "slow"; readonly factor: number; readonly seconds: number }
  | { readonly kind: "heal"; readonly percent: number }
  | { readonly kind: "burn"; readonly seconds: number; readonly damage: number }
  | { readonly kind: "poison"; readonly seconds: number; readonly damage: number; readonly maxStacks: number }
  | { readonly kind: "pierce"; readonly extra: number }
  | { readonly kind: "leech"; readonly percent: number }
  | { readonly kind: "chain"; readonly jumps: number; readonly percent: number; readonly radius: number }
  | { readonly kind: "nova"; readonly neighbors: number; readonly radius: number };

/** Três tons de uma cor, do claro ao escuro. */
export interface StaffRamp { readonly light: string; readonly mid: string; readonly dark: string }
/** A aparência do cajado, declarativa e independente do Canvas: o renderizador lê esta ficha. */
export interface StaffVisualProfile {
  /** Matéria do cajado: o carvalho do Aprendiz, a pena do vento, a rocha da terra, o coral da água, a brasa do fogo, o espinho da natureza, o cristal do gelo, o disco solar da luz, a lua crescente da sombra, a bobina do raio e as estrelas do astral. */
  readonly motif: "oak" | "feather" | "stone" | "coral" | "ember" | "thorn" | "crystal" | "sun" | "moon" | "coil" | "astral";
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

export const STAVES: Readonly<Record<StaffId, StaffDefinition>> = { apprentice: APPRENTICE_STAFF, breeze: BREEZE_STAFF, stone: STONE_STAFF, tide: TIDE_STAFF, ember: EMBER_STAFF, thorn: THORN_STAFF, frost: FROST_STAFF, sun: SUN_STAFF, moon: MOON_STAFF, storm: STORM_STAFF, astral: ASTRAL_STAFF };

export function isStaffId(value: unknown): value is StaffId {
  return typeof value === "string" && STAFF_IDS.some(id => id === value);
}
/** O mago usa o cajado se o nível dele alcança o do cajado e, quando o cajado é vendido, se ele já foi comprado. */
export function staffUnlocked(staff: StaffId, level: number, bought: readonly StaffId[] = []): boolean {
  return Number.isInteger(level) && level >= STAVES[staff].level && (STAVES[staff].price === undefined || bought.includes(staff));
}
