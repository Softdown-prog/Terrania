import type { WeaponDefinition } from "../../Weapons.ts";

/** Ficha autoritativa individual da espada bronze; combate e inventário consomem o catálogo central. */
export const BRONZE_SWORD = {name:"Gládio de Bronze Temperado",level:20,damage:26,interval:0.95,windup:0.09,nature:"physical",special:null,trail:{first:"#fff3c4",second:"#e6b800",opacity:0.9}} as const satisfies WeaponDefinition;
