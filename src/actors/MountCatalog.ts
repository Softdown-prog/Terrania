/** Montarias são companheiras do jogo SOLO, não monstros nem entidades de rede. */
export const MOUNT_IDS = [
  "warhorse", "mountain-goat", "imperial-elk", "fire-lion", "sand-basilisk",
  "cavern-bear", "silver-unicorn", "dark-griffin", "cargo-beetle", "tidal-hippocampus",
] as const;
export type MountId = typeof MOUNT_IDS[number];
export type RidingTier = 1 | 2 | 3;
export type MountRegion = "west" | "northwest" | "north" | "south" | "east" | "west-north" | "east-west";
export type MountAbility = "charge" | "climb" | "forest" | "fire-aura" | "desert" |
  "barrier" | "purify" | "glide" | "cargo" | "amphibious";
export interface MountLoot { readonly item: string; readonly chance: number }
export interface MountDefinition {
  readonly id: MountId;
  readonly name: string;
  readonly tier: RidingTier;
  readonly level: number;
  readonly saddle: string;
  readonly region: MountRegion;
  readonly hp: number;
  readonly stamina: number;
  readonly speedBonus: number;
  readonly waterSpeedBonus?: number;
  readonly attack: number;
  readonly attackName: string;
  readonly ability: MountAbility;
  readonly abilityDescription: string;
  readonly dropsOnTame: readonly MountLoot[];
  readonly bait: string;
}
export const RIDING_LEVEL: Readonly<Record<RidingTier, number>> = {1: 15, 2: 35, 3: 55};
export const STABLE_UPGRADE_GEL: Readonly<Record<RidingTier, number>> = {1: 12, 2: 25, 3: 40};
/** Um único catálogo, sem fichas duplicadas entre HUD, missões e motor. */
export const MOUNTS: Readonly<Record<MountId, MountDefinition>> = {
  warhorse: {
    id:"warhorse",name:"Cavalo de Batalha",tier:1,level:15,saddle:"Sela de Couro Simples",region:"west",
    hp:200,stamina:180,speedBonus:.40,attack:12,attackName:"Coice de Impacto",ability:"charge",
    abilityDescription:"Investida Firme: +20% de velocidade durante 4 s ao correr em linha reta.",
    dropsOnTame:[{item:"Crina Forte",chance:.8},{item:"Couro Comum",chance:1}],
    bait:"Maçã Silvestre",
  },
  "mountain-goat": {
    id:"mountain-goat",name:"Bode Montanhês Gigante",tier:1,level:25,saddle:"Sela de Montanha",region:"west",
    hp:230,stamina:220,speedBonus:.30,attack:15,attackName:"Cabeçada com Chifre",ability:"climb",
    abilityDescription:"Andarilho do Cume: ignora lentidão de encostas e escorregões.",
    dropsOnTame:[{item:"Lã Áspera de Bode",chance:.75},{item:"Chifre Quebrado",chance:.35}],
    bait:"Sal de Rocha",
  },
  "imperial-elk": {
    id:"imperial-elk",name:"Alce Imperial",tier:2,level:35,saddle:"Sela de Caçador",region:"northwest",
    hp:310,stamina:260,speedBonus:.45,attack:18,attackName:"Pisotear",ability:"forest",
    abilityDescription:"Agilidade das Sombras: evita a perda de velocidade em florestas e arbustos.",
    dropsOnTame:[{item:"Chifre de Alce Gigante",chance:.4},{item:"Couro Pesado",chance:1}],
    bait:"Ervas de Caçador",
  },
  "fire-lion": {
    id:"fire-lion",name:"Leão do Fogo / Cazador",tier:3,level:55,saddle:"Sela de Escamas Vulcânicas",region:"west",
    hp:450,stamina:320,speedBonus:.55,attack:35,attackName:"Morder / Garras de Fogo",ability:"fire-aura",
    abilityDescription:"Crina Ardente: ilumina e causa 5 de dano de fogo por contato.",
    dropsOnTame:[{item:"Juba de Fogo",chance:.3},{item:"Dente de Leão-Maravilha",chance:.15}],
    bait:"Amuleto de Brasa",
  },
  "sand-basilisk": {
    id:"sand-basilisk",name:"Lagarto das Areias",tier:2,level:40,saddle:"Sela de Escamas Rígidas",region:"south",
    hp:280,stamina:200,speedBonus:.35,attack:22,attackName:"Ataque com Cauda",ability:"desert",
    abilityDescription:"Fervor Desértico: sem fadiga extra no calor e sobre areia movediça por 5 s.",
    dropsOnTame:[{item:"Escama Arenosa",chance:.6},{item:"Glândula de Calor",chance:.2}],
    bait:"Suco de Cacto",
  },
  "cavern-bear": {
    id:"cavern-bear",name:"Urso-das-Cavernas",tier:2,level:45,saddle:"Sela de Ferro Boreal",region:"north",
    hp:550,stamina:180,speedBonus:.25,attack:40,attackName:"Garrada Esmagadora",ability:"barrier",
    abilityDescription:"Quebra-Barreiras: destrói gelo frágil e escombros, sem ignorar paredes sólidas.",
    dropsOnTame:[{item:"Garras Enormes de Urso",chance:.5},{item:"Gordura Glacial",chance:.7}],
    bait:"Peixe do Gelo",
  },
  "silver-unicorn": {
    id:"silver-unicorn",name:"Unicórnio de Prata",tier:3,level:60,saddle:"Sela Real Prateada",region:"east-west",
    hp:400,stamina:450,speedBonus:.60,attack:25,attackName:"Espetada Mágica",ability:"purify",
    abilityDescription:"Purificação: cura 5 HP/s e remove envenenamento enquanto galopa.",
    dropsOnTame:[{item:"Chifre Mágico Quebrado",chance:.2},{item:"Crina de Prata",chance:.4}],
    bait:"Água Pura da Fonte dos Anjos",
  },
  "dark-griffin": {
    id:"dark-griffin",name:"Grifo-Sombrio",tier:3,level:65,saddle:"Sela de Montaria Aérea",region:"west-north",
    hp:380,stamina:340,speedBonus:.50,attack:30,attackName:"Ataque de Garras",ability:"glide",
    abilityDescription:"Voo Curto: planar sobre vãos sem atravessar obstáculos fora do trajeto permitido.",
    dropsOnTame:[{item:"Pena Espessa de Grifo",chance:.5},{item:"Olho de Águia",chance:.15}],
    bait:"Carne de Caça Lendária",
  },
  "cargo-beetle": {
    id:"cargo-beetle",name:"Escaravelho de Carga",tier:1,level:30,saddle:"Arnês de Carga Pesada",region:"south",
    hp:480,stamina:300,speedBonus:.20,attack:10,attackName:"Empurrão com Pinça",ability:"cargo",
    abilityDescription:"Estoque Extra: 15 espaços móveis de transporte de materiais.",
    dropsOnTame:[{item:"Carapaça Pesada",chance:.75},{item:"Mandíbula Forte",chance:.2}],
    bait:"Ervas Medicinais",
  },
  "tidal-hippocampus": {
    id:"tidal-hippocampus",name:"Hipocampo das Marés",tier:2,level:40,saddle:"Sela Náutica de Algas",region:"east",
    hp:300,stamina:280,speedBonus:.25,waterSpeedBonus:.75,attack:15,attackName:"Chicote de Cauda",
    ability:"amphibious",abilityDescription:"Navegador Anfíbio: navega por água profunda, sem correnteza ou afogamento.",
    dropsOnTame:[{item:"Escamas d'Água",chance:.6},{item:"Nadadeira de Hipocampo",chance:.35}],
    bait:"Isca de Algas de Coral",
  },
};
export function isMountId(value: unknown): value is MountId {
  return typeof value === "string" && (MOUNT_IDS as readonly string[]).includes(value);
}
