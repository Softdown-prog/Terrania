import { LEATHER_SET } from "./set.ts";

/** O capuz de couro sem curtir, que cobre a cabeça e o pescoço (defesa 1): conjunto Couro Cru (ADR 0123), números propostos (o dono ajusta aqui). */
export const LEATHER_HOOD = { slot: "head", name: "Capuz de Couro Cru", defense: 1, ...LEATHER_SET } as const;
