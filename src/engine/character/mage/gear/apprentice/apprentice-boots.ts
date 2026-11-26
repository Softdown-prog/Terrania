import { APPRENTICE_SET } from "./set.ts";

/** As botas de couro roxo: conjunto do Aprendiz (ADR 0078), números propostos (o dono ajusta aqui). */
export const APPRENTICE_BOOTS = { slot: "feet", name: "Botas de Aprendiz", defense: 0, ...APPRENTICE_SET } as const;
