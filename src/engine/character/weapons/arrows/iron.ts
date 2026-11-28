import type { ArrowDefinition } from "../../Arrows.ts";

/**
 * A Flecha de Ferro (ADR 0117): ponta de ferro forjado, mais pesada. Números propostos (o dono ajusta aqui): +3 de dano somado ao do arco (8 do Arco de Caça
 * viram 11) e 3 de Terrania Gold cada, três vezes o preço da de junco.
 */
export const IRON_ARROW = { name: "Flecha de Ferro", bonusDamage: 3, price: 3 } as const satisfies ArrowDefinition;
