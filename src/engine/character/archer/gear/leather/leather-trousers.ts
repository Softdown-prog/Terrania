import { LEATHER_SET } from "./set.ts";

/** A calça de couro justa, sem proteção extra (defesa 0): conjunto Couro Cru (ADR 0123), números propostos (o dono ajusta aqui). */
export const LEATHER_TROUSERS = { slot: "legs", name: "Calça de Couro Cru", defense: 0, ...LEATHER_SET } as const;
