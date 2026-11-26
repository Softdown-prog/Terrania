import { APPRENTICE_SET } from "./set.ts";

/** O pingente de cristal baço: conjunto do Aprendiz (ADR 0078), números propostos (o dono ajusta aqui). */
export const DULL_CRYSTAL_PENDANT = { slot: "neck", name: "Pingente de Cristal Baço", defense: 0, ...APPRENTICE_SET } as const;
