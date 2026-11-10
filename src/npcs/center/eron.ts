import { STABLE_MASTER } from "../../world/mountLocations.ts";
import type { Npc } from "../types.ts";
export const eronNpc={id:"stablemaster",name:"Eron",role:"Mestre de Estábulos",...STABLE_MASTER} as const satisfies Npc;
/** Mantém o visual genérico de Eron, já usado em produção. */
export function eronDialogue():readonly string[] {
  return [
    "Sou Eron, guardião das montarias da Travessia. Antes de montar, construa o cercado e treine sua Cavalaria.",
    "Slimes romperam a cerca e o cavalo da guarnição fugiu ferido ao Bosque Oeste. O carpinteiro reparou o cercado, mas precisamos de sua ajuda.",
    "Depois de reconstruir o cercado e treinar Cavalaria I, entregarei a Maçã Silvestre Doce. Siga os cascos, afaste os slimes e traga o Garrano de volta.",
    "Cada montaria tem nível, sela e região próprios. As criaturas selvagens precisam de missões especiais.",
  ];
}
