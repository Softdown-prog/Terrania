import type { WeaponDefinition } from "../../Weapons.ts";

/** Ficha autoritativa individual da espada tempest; combate e inventário consomem o catálogo central. */
export const TEMPEST_SWORD = {name:"Sabre Abissal da Tempestade",level:90,damage:115,interval:1.15,windup:0.12,nature:"hybrid",special:"lightning",trail:{first:"#00b0ff",second:"#ffee58",opacity:1}} as const satisfies WeaponDefinition;
