import { BREEZE_SET } from "./set.ts";

/** O livro de magias da Brisa (o escudo do Mago): conjunto da Brisa (ADR 0080), números propostos (o dono ajusta aqui). */
export const BREEZE_TOME = { slot: "shield", name: "Compêndio das Brisas", defense: 0, ...BREEZE_SET } as const;
