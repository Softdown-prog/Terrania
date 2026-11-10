/** Hipocampo das Marés: navegação anfíbia. A ficha define regras, nunca Canvas. */
import type { MountDefinition } from "../MountCatalog.ts";

export const tidalHippocampus = {
    id:"tidal-hippocampus",name:"Hipocampo das Marés",tier:2,level:40,saddle:"Sela Náutica de Algas",region:"east",
    hp:300,stamina:280,speedBonus:.25,waterSpeedBonus:.75,attack:15,attackName:"Chicote de Cauda",
    ability:"amphibious",abilityDescription:"Navegador Anfíbio: navega por água profunda, sem correnteza ou afogamento.",
    dropsOnTame:[{item:"Escamas d'Água",chance:.6},{item:"Nadadeira de Hipocampo",chance:.35}],
    bait:"Isca de Algas de Coral",
} satisfies MountDefinition;
