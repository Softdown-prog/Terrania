import { BREEZE_SET } from "./set.ts";

/** A túnica azul-céu (defesa 1): conjunto da Brisa (ADR 0080), números propostos (o dono ajusta aqui). */
export const BREEZE_ROBE = { slot: "chest", name: "Túnica da Brisa", defense: 1, ...BREEZE_SET } as const;
