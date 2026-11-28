import { LEATHER_SET } from "./set.ts";

/** O gibão leve, de couro com cadarços, que deixa os braços livres para o arco (defesa 1): conjunto Couro Cru (ADR 0123), números propostos (o dono ajusta aqui). */
export const LEATHER_JERKIN = { slot: "chest", name: "Gibão de Couro Cru", defense: 1, ...LEATHER_SET } as const;
