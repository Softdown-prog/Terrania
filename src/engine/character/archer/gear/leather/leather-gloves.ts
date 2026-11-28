import { LEATHER_SET } from "./set.ts";

/** As luvas que protegem os dedos da corda; ocupam o lugar do escudo (defesa 1): conjunto Couro Cru (ADR 0123), números propostos (o dono ajusta aqui). */
export const LEATHER_GLOVES = { slot: "shield", name: "Luvas de Couro Cru", defense: 1, ...LEATHER_SET } as const;
