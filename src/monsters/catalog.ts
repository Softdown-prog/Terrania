import type { CreatureDefinition } from "./types.ts";
import { CENTER_MONSTERS } from "./center/index.ts";
import { NORTH_MONSTERS } from "./north/index.ts";
import { SOUTH_MONSTERS } from "./south/index.ts";
import { EAST_MONSTERS } from "./east/index.ts";
import { WEST_MONSTERS } from "./west/index.ts";

/** A sprite sheet é referência de silhueta, nunca uma textura carregada no jogo. */
export const SECOND_WAVE_KINDS = [
  "summit-griffin", "magma-salamander", "rotten-marsh-ent", "poison-scout-toad",
  "carrion-sandworm", "tundra-mammoth", "frost-banshee", "runic-polar-bear",
  "abyssal-octopus", "tide-hunter-triton",
] as const;
export type SecondWaveKind = typeof SECOND_WAVE_KINDS[number];
/** População numerosa dos ermos do Sul: tiers comuns 21–30. */
export const SOUTH_COMMON_KINDS = [
  "dune-rat", "sand-goblin", "desert-orc", "clay-troll", "dune-scout",
  "oasis-elf", "mirage-imp", "horned-viper", "carrion-vulture", "cactus-sprout",
] as const;
export type SouthCommonKind = typeof SOUTH_COMMON_KINDS[number];
/** Espécie exclusiva da superfície do Sul; não aparece em cavernas. */
export const SOUTH_SURFACE_KINDS = ["sand-beetle"] as const;
export const REGIONAL_CREATURE_KINDS = [
  "basalt-golem", "cliff-draconid", "mire-hydra", "dune-scorpion", "solar-scarab",
  "boreal-yeti", "glacial-wolf", "frost-spirit", "coral-crab", "storm-serpent",
  ...SECOND_WAVE_KINDS,
  ...SOUTH_COMMON_KINDS,
  ...SOUTH_SURFACE_KINDS,
] as const;
export type RegionalCreatureKind = typeof REGIONAL_CREATURE_KINDS[number];
export type CreatureKind = "slime" | RegionalCreatureKind;

/** Agregador tipado: cada ficha fica em sua região e espécie. */
export const CREATURE_CATALOG: Readonly<Record<CreatureKind, CreatureDefinition>> = Object.freeze({
  ...CENTER_MONSTERS,
  ...NORTH_MONSTERS,
  ...SOUTH_MONSTERS,
  ...EAST_MONSTERS,
  ...WEST_MONSTERS,
});

/** Defesa extra do besouro com HP estritamente abaixo de 20%. */
export function sandBeetleBuried(hp:number):boolean {
  return hp>0 && hp<CREATURE_CATALOG["sand-beetle"].maxHp*.2;
}

export interface CreatureView {
  readonly id: string;
  readonly kind: CreatureKind;
  readonly x: number;
  readonly y: number;
  readonly hp: number;
}

export type { CombatNature, SpecialAttack, DebuffKind, LootChance, CreatureDefinition } from "./types.ts";
