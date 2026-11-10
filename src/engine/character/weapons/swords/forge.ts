import type { WeaponDefinition } from "../../Weapons.ts";

/** Ficha autoritativa individual da espada forge; combate e inventário consomem o catálogo central. */
export const FORGE_SWORD = {name:"Espada Curta de Ferro Batido",level:10,damage:16,interval:1,windup:0.09,nature:"physical",special:null,trail:{first:"#d9e2ec",second:"#9fb3c8",opacity:0.9}} as const satisfies WeaponDefinition;
