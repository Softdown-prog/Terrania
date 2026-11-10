import type { WeaponDefinition } from "../../Weapons.ts";

/** Ficha autoritativa individual da espada astral; combate e inventário consomem o catálogo central. */
export const ASTRAL_SWORD = {name:"Espada Astral de Terrania",level:100,damage:140,interval:1.4,windup:0.16,nature:"hybrid",special:"astral",trail:{first:"#1a237e",second:"#ffd700",opacity:1}} as const satisfies WeaponDefinition;
