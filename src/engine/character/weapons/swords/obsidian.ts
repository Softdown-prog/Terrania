import type { WeaponDefinition } from "../../Weapons.ts";

/** Ficha autoritativa individual da espada obsidian; combate e inventário consomem o catálogo central. */
export const OBSIDIAN_SWORD = {name:"Lâmina Vulcânica de Obsidiana",level:70,damage:84,interval:1.25,windup:0.14,nature:"hybrid",special:"fire",trail:{first:"#ff5500",second:"#ffcc00",opacity:1}} as const satisfies WeaponDefinition;
