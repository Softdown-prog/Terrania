import { HUNTING_BOW } from "./weapons/bows/hunting.ts";
import { HORN_BOW } from "./weapons/bows/horn.ts";
import { YEW_BOW } from "./weapons/bows/yew.ts";
import { BONE_BOW } from "./weapons/bows/bone.ts";
import { EMBER_BOW } from "./weapons/bows/ember.ts";
import { THORN_BOW } from "./weapons/bows/thorn.ts";
import { BOREAL_BOW } from "./weapons/bows/boreal.ts";
import { SUN_BOW } from "./weapons/bows/sun.ts";
import { MOON_BOW } from "./weapons/bows/moon.ts";
import { STORM_BOW } from "./weapons/bows/storm.ts";
import { ASTRAL_BOW } from "./weapons/bows/astral.ts";

/**
 * Catálogo dos arcos do Arqueiro (ADR 0110, lista em `docs/ARQUEIRO.md`). Os onze espelham as espadas; o Arco de Caça é o primeiro e os outros dez entram em lotes (A4):
 * o lote A4a traz o de Chifre, o Longo de Teixo e o de Osso (ADR 0120) o A4b o de Brasa, o de Espinheiro e o Boreal (ADR 0121) e o A4c o Solar, o da Lua Negra, o da Tempestade e o Estelar (ADR 0122), que completa os onze. Só dados, sem Canvas: o desenho dos arcos vem no lote A2.
 */
export const BOW_IDS = ["hunting", "horn", "yew", "bone", "ember", "thorn", "boreal", "sun", "moon", "storm", "astral"] as const;
export type BowId = typeof BOW_IDS[number];
export const DEFAULT_BOW: BowId = "hunting";

/** A aparência do arco, declarativa e independente do Canvas (ADR 0116): três tons da madeira, a corda, o couro da empunhadura e as pontas. */
export interface BowVisualProfile {
  readonly limb: { readonly light: string; readonly mid: string; readonly dark: string };
  readonly string: string;
  readonly wrap: string;
  readonly wrapDark: string;
  readonly tip: string;
  /** A borla de fio pendurada na empunhadura. */
  readonly charm: string;
  /** O comprimento do arco em relação ao de Caça (1): o arco longo passa de 1. */
  readonly length: number;
  /** Quanto as pontas viram para a frente, em pixels (0 = pontas retas): o coice do chifre e do osso. */
  readonly flick: number;
}

export interface BowDefinition {
  readonly name: string;
  /** O nível que libera o arco (o do arco de caça é 0: o Arqueiro já nasce com ele). */
  readonly level: number;
  /** Dano da flecha, antes da defesa do alvo. */
  readonly damage: number;
  /** Segundos entre um tiro e o próximo. */
  readonly interval: number;
  /** Segundos de preparo até a flecha sair. */
  readonly windup: number;
  /** Alcance do tiro, em tiles. */
  readonly range: number;
  /** Flechas gastas por tiro. */
  readonly arrowsPerShot: number;
  /** De que é feito. */
  readonly material: string;
  readonly visual: BowVisualProfile;
}

export const BOWS: Readonly<Record<BowId, BowDefinition>> = { hunting: HUNTING_BOW, horn: HORN_BOW, yew: YEW_BOW, bone: BONE_BOW, ember: EMBER_BOW, thorn: THORN_BOW, boreal: BOREAL_BOW, sun: SUN_BOW, moon: MOON_BOW, storm: STORM_BOW, astral: ASTRAL_BOW };

export function isBowId(value: unknown): value is BowId {
  return typeof value === "string" && BOW_IDS.some(id => id === value);
}
/** O Arqueiro usa o arco se o nível dele alcança o do arco. */
export const bowUnlocked = (bow: BowId, level: number): boolean => Number.isInteger(level) && level >= BOWS[bow].level;
