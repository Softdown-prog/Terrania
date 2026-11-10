/** Urso-das-Cavernas: força para quebrar gelo e escombros frágeis. A ficha define regras, nunca Canvas. */
import type { MountDefinition } from "../MountCatalog.ts";

export const cavernBear = {
    id:"cavern-bear",name:"Urso-das-Cavernas",tier:2,level:45,saddle:"Sela de Ferro Boreal",region:"north",
    hp:550,stamina:180,speedBonus:.25,attack:40,attackName:"Garrada Esmagadora",ability:"barrier",
    abilityDescription:"Quebra-Barreiras: destrói gelo frágil e escombros, sem ignorar paredes sólidas.",
    dropsOnTame:[{item:"Garras Enormes de Urso",chance:.5},{item:"Gordura Glacial",chance:.7}],
    bait:"Peixe do Gelo",
} satisfies MountDefinition;
