import { BREEZE_SET } from "./set.ts";

/** A calça leve (defesa 1): conjunto da Brisa (ADR 0080), números propostos (o dono ajusta aqui). */
export const BREEZE_TROUSERS = { slot: "legs", name: "Calça do Vento Leve", defense: 1, ...BREEZE_SET } as const;
