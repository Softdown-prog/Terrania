import type { WorldRegion } from "../world/regions.ts";
import type { CaveTheme } from "../world/caves.ts";
import type { Biome } from "../world/biomes.ts";

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
export const REGIONAL_CREATURE_KINDS = [
  "basalt-golem", "cliff-draconid", "mire-hydra", "dune-scorpion", "solar-scarab",
  "boreal-yeti", "glacial-wolf", "frost-spirit", "coral-crab", "storm-serpent",
  ...SECOND_WAVE_KINDS,
  ...SOUTH_COMMON_KINDS,
] as const;
export type RegionalCreatureKind = typeof REGIONAL_CREATURE_KINDS[number];
export type CreatureKind = "slime" | RegionalCreatureKind;
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

  "summit-griffin": {
    name: "Grifo das Cumeadas", maxHp: 260, contactDamage: 33, experience: 220,
    nature: "physical", special: "gust", speed: 83, range: 112, interval: 2.4,
    status: null, statusSeconds: 0, region: "west", caveThemes: ["basalt"],
    biomes: ["highlands", "stone-peak"],
    loot: [{ item: "Pena Cinzenta Rara", chance: .65 }, { item: "Garra Afiada", chance: .45 }, { item: "Carne de Caça", chance: .70 }],
  },
  "magma-salamander": {
    name: "Salamandra de Magma", maxHp: 220, contactDamage: 31, experience: 205,
    nature: "hybrid", special: "lava-burst", speed: 53, range: 152, interval: 2.6,
    status: "burn", statusSeconds: 4, region: "west", caveThemes: ["basalt"],
    biomes: ["volcanic", "stone-peak"],
    loot: [{ item: "Escama Incandescente", chance: .55 }, { item: "Carvão Mineral", chance: .75 }, { item: "Núcleo de Brasa", chance: .18 }],
  },
  "rotten-marsh-ent": {
    name: "Ent Apodrecido do Pântano", maxHp: 350, contactDamage: 27, experience: 255,
    nature: "hybrid", special: "spore-cloud", speed: 24, range: 72, interval: 3.1,
    status: "poison", statusSeconds: 6, region: "south", caveThemes: ["marsh"],
    biomes: ["oasis", "ruins"],
    loot: [{ item: "Madeira Encharcada", chance: .80 }, { item: "Cogumelo Luminoso", chance: .50 }, { item: "Seiva Tóxica", chance: .30 }],
  },
  "poison-scout-toad": {
    name: "Sapo Batedor Venenoso", maxHp: 165, contactDamage: 23, experience: 130,
    nature: "physical", special: "tongue", speed: 70, range: 74, interval: 1.5,
    status: "poison", statusSeconds: 6, region: "south", caveThemes: ["marsh"],
    biomes: ["oasis", "ruins"],
    loot: [{ item: "Glândula de Veneno", chance: .60 }, { item: "Perna de Rã", chance: .65 }, { item: "Mucosa Pantanosa", chance: .40 }],
  },
  "carrion-sandworm": {
    name: "Verme da Areia Carniceiro", maxHp: 310, contactDamage: 35, experience: 245,
    nature: "physical", special: "burrow", speed: 39, range: 128, interval: 3.1,
    status: null, statusSeconds: 0, region: "south", caveThemes: ["desert"],
    biomes: ["dunes", "ruins"],
    loot: [{ item: "Placa Quitinosa", chance: .60 }, { item: "Dente de Verme", chance: .35 }, { item: "Quartzo Bruto", chance: .25 }],
  },
  "tundra-mammoth": {
    name: "Mamute Blindado da Tundra", maxHp: 450, contactDamage: 40, experience: 340,
    nature: "physical", special: "trample", speed: 32, range: 46, interval: 2.9,
    status: "stun", statusSeconds: .75, region: "north", caveThemes: ["glacial"],
    biomes: ["tundra", "snowfield"],
    loot: [{ item: "Marfim Glacial", chance: .30 }, { item: "Couro Pesado", chance: .85 }, { item: "Carne Nobre", chance: .90 }],
  },
  "frost-banshee": {
    name: "Banshee da Geada", maxHp: 155, contactDamage: 37, experience: 185,
    nature: "magical", special: "spectral-ice", speed: 62, range: 185, interval: 2.6,
    status: "slow", statusSeconds: 3.5, region: "north", caveThemes: ["glacial"],
    biomes: ["snowfield", "frozen-lake"],
    loot: [{ item: "Ectoplasma Congelado", chance: .35 }, { item: "Fragmento de Runa", chance: .12 }],
  },
  "runic-polar-bear": {
    name: "Urso Polar Rúnico", maxHp: 340, contactDamage: 34, experience: 260,
    nature: "hybrid", special: "rune-bite", speed: 53, range: 28, interval: 1.7,
    status: "freeze", statusSeconds: .9, region: "north", caveThemes: ["glacial"],
    biomes: ["tundra", "snowfield"],
    loot: [{ item: "Pelagem Branca Real", chance: .60 }, { item: "Garra de Cristal", chance: .40 }, { item: "Carne Gorda", chance: .75 }],
  },
  "abyssal-octopus": {
    name: "Polvo Abissal dos Recifes", maxHp: 275, contactDamage: 29, experience: 220,
    nature: "hybrid", special: "ink", speed: 37, range: 138, interval: 2.6,
    status: "blind", statusSeconds: 4, region: "east", caveThemes: ["coastal"],
    biomes: ["beach", "island"],
    loot: [{ item: "Tentáculo Fresco", chance: .70 }, { item: "Bolsa de Tinta Abissal", chance: .50 }, { item: "Moedas Antigas", chance: .45 }],
  },
  "tide-hunter-triton": {
    name: "Tritão Caçador das Marés", maxHp: 250, contactDamage: 36, experience: 245,
    nature: "hybrid", special: "tidal-lightning", speed: 65, range: 181, interval: 2.7,
    status: null, statusSeconds: 0, region: "east", caveThemes: ["coastal"],
    biomes: ["beach", "island"],
    loot: [{ item: "Escama Azulada", chance: .65 }, { item: "Coral Energizado", chance: .30 }, { item: "Tridente das Marés", chance: .04 }],
  },

  // Lote 3: frequentes e de baixo tier no Sul. Chance é por item e por morte.
  "dune-rat": {
    name: "Rato das Dunas", maxHp: 35, contactDamage: 6, experience: 16,
    nature: "physical", special: "infected-bite", speed: 90, range: 24, interval: .62,
    status: "infection", statusSeconds: 3, region: "south", caveThemes: ["desert"],
    biomes: ["oasis", "ruins", "dunes"],
    loot: [{ item: "Rabo de Rato", chance: .50 }, { item: "Carne Magra", chance: .40 }, { item: "Queijo Seco", chance: .10 }],
  },
  "sand-goblin": {
    name: "Goblin Saqueador da Areia", maxHp: 65, contactDamage: 11, experience: 29,
    nature: "physical", special: "sand-throw", speed: 77, range: 115, interval: 1.15,
    status: null, statusSeconds: 0, region: "south", caveThemes: ["desert"],
    biomes: ["dunes", "ruins"],
    loot: [{ item: "Moedas de Cobre", chance: .85 }, { item: "Adaga Enferrujada", chance: .15 }, { item: "Retalho de Pano", chance: .60 }],
  },
  "desert-orc": {
    name: "Orc Nômade do Deserto", maxHp: 110, contactDamage: 17, experience: 54,
    nature: "physical", special: "orc-club", speed: 54, range: 28, interval: 1.35,
    status: null, statusSeconds: 0, region: "south", caveThemes: ["desert"],
    biomes: ["ruins", "dunes"],
    loot: [{ item: "Osso Talhado", chance: .55 }, { item: "Bracelete de Couro", chance: .25 }, { item: "Carne Seca", chance: .50 }, { item: "Moedas de Ouro", chance: .40 }],
  },
  "clay-troll": {
    name: "Troll de Barro Seco", maxHp: 145, contactDamage: 15, experience: 65,
    nature: "physical", special: "clay-clod", speed: 30, range: 108, interval: 2.35,
    status: null, statusSeconds: 0, region: "south", caveThemes: ["marsh", "desert"],
    biomes: ["oasis", "ruins"],
    loot: [{ item: "Argila Ressecada", chance: .75 }, { item: "Tora de Madeira Seca", chance: .45 }, { item: "Pedra Bruta", chance: .60 }],
  },
  "dune-scout": {
    name: "Pequenino Batedor das Dunas", maxHp: 75, contactDamage: 12, experience: 34,
    nature: "physical", special: "sling", speed: 68, range: 139, interval: 1.55,
    status: null, statusSeconds: 0, region: "south", caveThemes: ["desert"],
    biomes: ["oasis", "ruins", "dunes"],
    loot: [{ item: "Bolsa de Sementes", chance: .50 }, { item: "Pedra Polida", chance: .65 }, { item: "Pão de Viagem", chance: .35 }, { item: "Moedas de Prata", chance: .50 }],
  },
  "oasis-elf": {
    name: "Elfo Patrulheiro do Oásis", maxHp: 90, contactDamage: 16, experience: 45,
    nature: "hybrid", special: "sun-spear", speed: 64, range: 29, interval: 1.25,
    status: null, statusSeconds: 0, region: "south", caveThemes: ["desert"],
    biomes: ["oasis", "ruins"],
    loot: [{ item: "Tecido de Linho Fino", chance: .50 }, { item: "Tâmara do Oásis", chance: .60 }, { item: "Ponta de Lança Élfica", chance: .18 }],
  },
  "mirage-imp": {
    name: "Diabrete de Miragem", maxHp: 55, contactDamage: 14, experience: 30,
    nature: "magical", special: "mirage-sparks", speed: 58, range: 104, interval: 1.7,
    status: "blind", statusSeconds: 1.25, region: "south", caveThemes: ["desert"],
    biomes: ["dunes", "ruins"],
    loot: [{ item: "Pó Cintilante", chance: .45 }],
  },
  "horned-viper": {
    name: "Víbora-de-Chifre Comum", maxHp: 45, contactDamage: 10, experience: 22,
    nature: "physical", special: "weak-venom", speed: 76, range: 23, interval: .98,
    status: "weak-venom", statusSeconds: 4, region: "south", caveThemes: ["desert"],
    biomes: ["dunes", "oasis", "ruins"],
    loot: [{ item: "Presa Pequena", chance: .50 }, { item: "Couro de Cobra", chance: .40 }],
  },
  "carrion-vulture": {
    name: "Abutre Carniceiro do Sul", maxHp: 50, contactDamage: 9, experience: 24,
    nature: "physical", special: "carrion-dive", speed: 83, range: 26, interval: 1.12,
    status: null, statusSeconds: 0, region: "south", caveThemes: ["desert"],
    biomes: ["dunes", "ruins"],
    loot: [{ item: "Pena Escura", chance: .70 }, { item: "Carne Fibrosa", chance: .30 }],
  },
  "cactus-sprout": {
    name: "Brotinho de Cacto Animado", maxHp: 60, contactDamage: 8, experience: 25,
    nature: "magical", special: "thorns", speed: 38, range: 25, interval: 1.55,
    status: null, statusSeconds: 0, region: "south", caveThemes: ["desert"],
    biomes: ["dunes", "ruins", "oasis"],
    loot: [{ item: "Flor do Deserto", chance: .40 }, { item: "Polpa de Cacto Hidratante", chance: .65 }, { item: "Espinho Verde", chance: .55 }],
  },
});

export interface CreatureView {
  readonly id: string;
  readonly kind: CreatureKind;
  readonly x: number;
  readonly y: number;
  readonly hp: number;
}
