import { LEATHER_SET } from "./set.ts";

/** O colar de couro com um dente de javali, só enfeite (defesa 0): conjunto Couro Cru (ADR 0123), números propostos (o dono ajusta aqui). */
export const TOOTH_NECKLACE = { slot: "neck", name: "Colar de Dente", defense: 0, ...LEATHER_SET } as const;
