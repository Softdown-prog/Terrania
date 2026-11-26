import { BREEZE_SET } from "./set.ts";

/** O chapéu com penas (mana máxima +2%): conjunto da Brisa (ADR 0080), números propostos (o dono ajusta aqui). */
export const BREEZE_HAT = { slot: "head", name: "Chapéu de Penas", defense: 0, bonus: { mana: 2 }, ...BREEZE_SET } as const;
