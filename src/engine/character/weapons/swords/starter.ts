import type { WeaponDefinition } from "../../Weapons.ts";

/** Ficha autoritativa individual da espada starter; combate e inventário consomem o catálogo central. */
export const STARTER_SWORD = {name:"Espada de Treino de Carvalho",level:0,damage:8,interval:0.8,windup:0.07,nature:"physical",special:null,trail:{first:"#8c7355",second:"#b69b6b",opacity:0.4}} as const satisfies WeaponDefinition;
