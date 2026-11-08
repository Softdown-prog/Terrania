import type { WorldRegion } from "../world/regions.ts";
import type { CaveTheme } from "../world/caves.ts";
import type { Biome } from "../world/biomes.ts";

/** A sprite sheet é referência de silhueta, nunca uma textura carregada no jogo. */
export const REGIONAL_CREATURE_KINDS = [
  "basalt-golem", "cliff-draconid", "mire-hydra", "dune-scorpion", "solar-scarab",
  "boreal-yeti", "glacial-wolf", "frost-spirit", "coral-crab", "storm-serpent",
] as const;
export type RegionalCreatureKind = typeof REGIONAL_CREATURE_KINDS[number];
export type CreatureKind = "slime" | RegionalCreatureKind;
export type CombatNature = "physical" | "magical" | "hybrid";
export type SpecialAttack =
  "none" | "boulder" | "fire" | "acid" | "venom" | "solar-burst" |
  "snowball" | "frost-bite" | "ice-shards" | "reef-stones" | "lightning";
export type DebuffKind = "slow" | "poison" | "freeze" | "attack-slow";
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
/** Tipo, números, habitat e tabela de drops são partilhados entre combate e arte. */
export const CREATURE_CATALOG: Readonly<Record<CreatureKind, CreatureDefinition>> = Object.freeze({
  slime: {
    name: "Slime", maxHp: 2, contactDamage: 9, experience: 10,
    nature: "physical", special: "none", speed: 38, range: 24, interval: 1.2,
    status: null, statusSeconds: 0, region: "center", caveThemes: ["verdant"],
    biomes: ["meadow", "woodland", "trail"], loot: [{ item: "gel", chance: 1 }],
  },
  "basalt-golem": {
    name: "Golem de Basalto", maxHp: 320, contactDamage: 28, experience: 240,
    nature: "physical", special: "boulder", speed: 27, range: 165, interval: 3.2,
    status: "slow", statusSeconds: 2.5, region: "west", caveThemes: ["basalt"],
    biomes: ["highlands", "stone-peak", "volcanic"],
    loot: [{ item: "Minério de Ferro Bruto", chance: .6 }, { item: "Núcleo de Rocha", chance: .2 }, { item: "Moedas de Ouro", chance: .8 }],
  },
  "cliff-draconid": {
    name: "Draconato das Escarpas", maxHp: 190, contactDamage: 34, experience: 185,
    nature: "hybrid", special: "fire", speed: 52, range: 155, interval: 2.4,
    status: null, statusSeconds: 0, region: "west", caveThemes: ["basalt"],
    biomes: ["stone-peak", "volcanic"],
    loot: [{ item: "Escama Vulcânica", chance: .45 }, { item: "Carne Fibrosa", chance: .5 }, { item: "Glândula de Brasa", chance: .15 }],
  },
  "mire-hydra": {
    name: "Hidra de Lodo", maxHp: 210, contactDamage: 22, experience: 175,
    nature: "magical", special: "acid", speed: 30, range: 155, interval: 2.8,
    status: "poison", statusSeconds: 6, region: "south", caveThemes: ["marsh"],
    biomes: ["oasis", "ruins"],
    loot: [{ item: "Gosma Tóxica", chance: .7 }, { item: "Erva do Pântano", chance: .4 }, { item: "Antídoto Natural", chance: .2 }],
  },
  "dune-scorpion": {
    name: "Escorpião das Dunas", maxHp: 150, contactDamage: 26, experience: 120,
    nature: "physical", special: "venom", speed: 92, range: 27, interval: .83,
    status: "poison", statusSeconds: 6, region: "south", caveThemes: ["desert"],
    biomes: ["dunes", "ruins"],
    loot: [{ item: "Ferrão Quitinoso", chance: .55 }, { item: "Veneno Destilado", chance: .25 }, { item: "Carapaça Seca", chance: .5 }],
  },
  "solar-scarab": {
    name: "Escaravelho Solar", maxHp: 130, contactDamage: 19, experience: 175,
    nature: "magical", special: "solar-burst", speed: 78, range: 27, interval: 1.25,
    status: null, statusSeconds: 0, region: "south", caveThemes: ["desert"],
    biomes: ["dunes", "ruins"],
    loot: [{ item: "Poeira Dourada", chance: 1 }], autoLoot: true,
  },
  "boreal-yeti": {
    name: "Yeti Boreal", maxHp: 380, contactDamage: 36, experience: 280,
    nature: "physical", special: "snowball", speed: 34, range: 165, interval: 3.4,
    status: "freeze", statusSeconds: 1.3, region: "north", caveThemes: ["glacial"],
    biomes: ["tundra", "snowfield"],
    loot: [{ item: "Pelagem Espessa", chance: .65 }, { item: "Carne Congelada", chance: .75 }, { item: "Clava de Osso", chance: .1 }],
  },
  "glacial-wolf": {
    name: "Lobo de Cristal Glacial", maxHp: 140, contactDamage: 25, experience: 110,
    nature: "physical", special: "frost-bite", speed: 98, range: 26, interval: .92,
    status: null, statusSeconds: 0, region: "north", caveThemes: ["glacial"],
    biomes: ["tundra", "snowfield", "frozen-lake"],
    loot: [{ item: "Presa Afiada", chance: .6 }, { item: "Couro Ártico", chance: .45 }],
  },
  "frost-spirit": {
    name: "Espírito da Geada", maxHp: 160, contactDamage: 32, experience: 150,
    nature: "magical", special: "ice-shards", speed: 63, range: 185, interval: 2.5,
    status: "attack-slow", statusSeconds: 3, region: "north", caveThemes: ["glacial"],
    biomes: ["snowfield", "frozen-lake"],
    loot: [{ item: "Essência de Gelo", chance: .5 }, { item: "Cristal Boreal", chance: .2 }],
  },
  "coral-crab": {
    name: "Caranguejo de Coral Gigante", maxHp: 240, contactDamage: 21, experience: 150,
    nature: "physical", special: "reef-stones", speed: 32, range: 122, interval: 2.7,
    status: null, statusSeconds: 0, region: "east", caveThemes: ["coastal"],
    biomes: ["beach", "island"],
    loot: [{ item: "Carne de Siri", chance: .8 }, { item: "Fragmento de Coral", chance: .5 }, { item: "Pérola Marinha", chance: .08 }],
  },
  "storm-serpent": {
    name: "Serpente Abissal da Tempestade", maxHp: 290, contactDamage: 38, experience: 270,
    nature: "magical", special: "lightning", speed: 67, range: 205, interval: 2.7,
    status: null, statusSeconds: 0, region: "east", caveThemes: ["coastal"],
    biomes: ["island", "beach"],
    loot: [{ item: "Escama Condutora", chance: .4 }, { item: "Orbe da Tempestade", chance: .12 }, { item: "Espada de Coral Rara", chance: .03 }],
  },
});

export interface CreatureView {
  readonly id: string;
  readonly kind: CreatureKind;
  readonly x: number;
  readonly y: number;
  readonly hp: number;
}
