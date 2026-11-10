/** Bode Montanhês: deslocamento em encostas e cabeçada. A ficha define regras, nunca Canvas. */
import type { MountDefinition } from "../MountCatalog.ts";

export const mountainGoat = {
    id:"mountain-goat",name:"Bode Montanhês Gigante",tier:1,level:25,saddle:"Sela de Montanha",region:"west",
    hp:230,stamina:220,speedBonus:.30,attack:15,attackName:"Cabeçada com Chifre",ability:"climb",
    abilityDescription:"Andarilho do Cume: ignora lentidão de encostas e escorregões.",
    dropsOnTame:[{item:"Lã Áspera de Bode",chance:.75},{item:"Chifre Quebrado",chance:.35}],
    bait:"Sal de Rocha",
} satisfies MountDefinition;
