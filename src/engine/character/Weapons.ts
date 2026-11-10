/** Catalog for the Knight's ten illustrated sword tiers. The legacy `forge`
 * ID is deliberately reused as iron, so preexisting saved purchases survive. */
export const WEAPON_IDS = ["starter","forge","bronze","copper","dunes","boreal","obsidian","marsh","tempest","astral"] as const;
export type WeaponId = typeof WEAPON_IDS[number];
export type SwordSpecial = "push" | "bleed" | "ice" | "fire" | "poison" | "lightning" | "astral";
export interface WeaponDefinition {
  readonly name: string;
  readonly level: number;
  readonly damage: number;
  readonly interval: number;
  readonly windup: number;
  readonly nature: "physical" | "hybrid";
  readonly special: SwordSpecial | null;
  readonly trail: { readonly first: string; readonly second: string; readonly opacity: number };
}

export interface WeaponLoadout {
  readonly forged: boolean;
  readonly equipped: WeaponId;
}

/** All ten illustrations use these authoritative gameplay and FX colors. */
export const WEAPONS: Readonly<Record<WeaponId, WeaponDefinition>> = {
  "starter": {name:"Espada de Treino de Carvalho",level:0,damage:8,interval:0.8,windup:0.07,nature:"physical",special:null,trail:{first:"#8c7355",second:"#b69b6b",opacity:0.4}},
  "forge": {name:"Espada Curta de Ferro Batido",level:10,damage:16,interval:1,windup:0.09,nature:"physical",special:null,trail:{first:"#d9e2ec",second:"#9fb3c8",opacity:0.9}},
  "bronze": {name:"Gládio de Bronze Temperado",level:20,damage:26,interval:0.95,windup:0.09,nature:"physical",special:null,trail:{first:"#fff3c4",second:"#e6b800",opacity:0.9}},
  "copper": {name:"Montante de Cobre Rubro",level:30,damage:38,interval:1.35,windup:0.16,nature:"physical",special:"push",trail:{first:"#d96b27",second:"#8c3811",opacity:0.95}},
  "dunes": {name:"Lâmina Serrilhada das Dunas",level:45,damage:52,interval:1.15,windup:0.11,nature:"physical",special:"bleed",trail:{first:"#e0b468",second:"#a67c37",opacity:0.95}},
  "boreal": {name:"Espada de Cristal Boreal",level:60,damage:68,interval:1.1,windup:0.11,nature:"hybrid",special:"ice",trail:{first:"#80e5ff",second:"#ffffff",opacity:1}},
  "obsidian": {name:"Lâmina Vulcânica de Obsidiana",level:70,damage:84,interval:1.25,windup:0.14,nature:"hybrid",special:"fire",trail:{first:"#ff5500",second:"#ffcc00",opacity:1}},
  "marsh": {name:"Cutelo Peçonhento do Charco",level:80,damage:98,interval:1.3,windup:0.14,nature:"hybrid",special:"poison",trail:{first:"#76ff03",second:"#6a1b9a",opacity:1}},
  "tempest": {name:"Sabre Abissal da Tempestade",level:90,damage:115,interval:1.15,windup:0.12,nature:"hybrid",special:"lightning",trail:{first:"#00b0ff",second:"#ffee58",opacity:1}},
  "astral": {name:"Espada Astral de Terrania",level:100,damage:140,interval:1.4,windup:0.16,nature:"hybrid",special:"astral",trail:{first:"#1a237e",second:"#ffd700",opacity:1}},
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
