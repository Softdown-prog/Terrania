import type { WeaponDefinition } from "../../Weapons.ts";

/** Ficha autoritativa individual da espada dunes; combate e inventário consomem o catálogo central. */
export const DUNES_SWORD = {name:"Lâmina Serrilhada das Dunas",level:45,damage:52,interval:1.15,windup:0.11,nature:"physical",special:"bleed",trail:{first:"#e0b468",second:"#a67c37",opacity:0.95}} as const satisfies WeaponDefinition;
