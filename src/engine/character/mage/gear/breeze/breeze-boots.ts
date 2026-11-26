import { BREEZE_SET } from "./set.ts";

/** As botas de sopro: conjunto da Brisa (ADR 0080), números propostos (o dono ajusta aqui). */
export const BREEZE_BOOTS = { slot: "feet", name: "Botas de Sopro", defense: 0, ...BREEZE_SET } as const;
