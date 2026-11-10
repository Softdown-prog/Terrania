/** Alce Imperial: deslocamento em floresta e ataque de pisoteio. A ficha define regras, nunca Canvas. */
import type { MountDefinition } from "../MountCatalog.ts";

export const imperialElk = {
    id:"imperial-elk",name:"Alce Imperial",tier:2,level:35,saddle:"Sela de Caçador",region:"northwest",
    hp:310,stamina:260,speedBonus:.45,attack:18,attackName:"Pisotear",ability:"forest",
    abilityDescription:"Agilidade das Sombras: evita a perda de velocidade em florestas e arbustos.",
    dropsOnTame:[{item:"Chifre de Alce Gigante",chance:.4},{item:"Couro Pesado",chance:1}],
    bait:"Ervas de Caçador",
} satisfies MountDefinition;
