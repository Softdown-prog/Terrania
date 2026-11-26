import { APPRENTICE_SET } from "./set.ts";

/** A calça violeta-noite: conjunto do Aprendiz (ADR 0078), números propostos (o dono ajusta aqui). */
export const APPRENTICE_TROUSERS = { slot: "legs", name: "Calça de Aprendiz", defense: 0, ...APPRENTICE_SET } as const;
