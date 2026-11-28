import { LEATHER_SET } from "./set.ts";

/** As botas macias de caçador, para andar sem fazer barulho (defesa 0): conjunto Couro Cru (ADR 0123), números propostos (o dono ajusta aqui). */
export const LEATHER_BOOTS = { slot: "feet", name: "Botas de Couro Cru", defense: 0, ...LEATHER_SET } as const;
