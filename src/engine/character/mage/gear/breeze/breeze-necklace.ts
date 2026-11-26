import { BREEZE_SET } from "./set.ts";

/** O colar de pena e vidro (recarga de mana +2%): conjunto da Brisa (ADR 0080), números propostos (o dono ajusta aqui). */
export const BREEZE_NECKLACE = { slot: "neck", name: "Colar de Pena e Vidro", defense: 0, bonus: { regen: 2 }, ...BREEZE_SET } as const;
