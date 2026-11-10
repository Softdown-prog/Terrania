import type { WeaponDefinition } from "../../Weapons.ts";

/** Ficha autoritativa individual da espada copper; combate e inventário consomem o catálogo central. */
export const COPPER_SWORD = {name:"Montante de Cobre Rubro",level:30,damage:38,interval:1.35,windup:0.16,nature:"physical",special:"push",trail:{first:"#d96b27",second:"#8c3811",opacity:0.95}} as const satisfies WeaponDefinition;
