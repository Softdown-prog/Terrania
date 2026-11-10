/** Escaravelho de Carga: transporte com espaços de carga adicionais. A ficha define regras, nunca Canvas. */
import type { MountDefinition } from "../MountCatalog.ts";

export const cargoBeetle = {
    id:"cargo-beetle",name:"Escaravelho de Carga",tier:1,level:30,saddle:"Arnês de Carga Pesada",region:"south",
    hp:480,stamina:300,speedBonus:.20,attack:10,attackName:"Empurrão com Pinça",ability:"cargo",
    abilityDescription:"Estoque Extra: 15 espaços móveis de transporte de materiais.",
    dropsOnTame:[{item:"Carapaça Pesada",chance:.75},{item:"Mandíbula Forte",chance:.2}],
    bait:"Ervas Medicinais",
} satisfies MountDefinition;
