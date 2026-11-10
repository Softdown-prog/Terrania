import type { WorldRegion } from "../world/regions.ts";
import type { CaveTheme } from "../world/caves.ts";
import type { Biome } from "../world/biomes.ts";

/** Contrato único de atributos do bestiário; nenhuma lógica visual aqui. */
export type CombatNature = "physical" | "magical" | "hybrid";
export type SpecialAttack =
  "none" | "boulder" | "fire" | "acid" | "venom" | "solar-burst" |
  "snowball" | "frost-bite" | "ice-shards" | "reef-stones" | "lightning" |
  "gust" | "lava-burst" | "spore-cloud" | "tongue" | "burrow" |
  "trample" | "spectral-ice" | "rune-bite" | "ink" | "tidal-lightning" |
  "infected-bite" | "sand-throw" | "orc-club" | "clay-clod" | "sling" |
  "sun-spear" | "mirage-sparks" | "weak-venom" | "carrion-dive" | "thorns";
export type DebuffKind = "slow" | "poison" | "freeze" | "attack-slow" | "burn" | "stun" | "blind" | "infection" | "weak-venom";
export interface LootChance { readonly item: string; readonly chance: number; }
export interface CreatureDefinition {
  readonly name: string;
  readonly maxHp: number;
  readonly contactDamage: number;
  readonly experience: number;
  readonly nature: CombatNature;
  readonly special: SpecialAttack;
  readonly speed: number;
  readonly range: number;
  readonly interval: number;
  readonly status: DebuffKind | null;
  readonly statusSeconds: number;
  readonly region: WorldRegion;
  readonly caveThemes: readonly CaveTheme[];
  readonly biomes: readonly Biome[];
  readonly loot: readonly LootChance[];
  readonly autoLoot?: boolean;
}
