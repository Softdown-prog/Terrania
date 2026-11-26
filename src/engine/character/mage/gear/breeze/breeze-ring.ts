import { BREEZE_SET } from "./set.ts";

/** O anel de prata (dano das magias +1%): conjunto da Brisa (ADR 0080), números propostos (o dono ajusta aqui). */
export const BREEZE_RING = { slot: "ring", name: "Anel do Sopro", defense: 0, bonus: { damage: 1 }, ...BREEZE_SET } as const;
