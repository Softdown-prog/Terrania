import { APPRENTICE_SET } from "./set.ts";

/** O anel de latão com a pedra azul: conjunto do Aprendiz (ADR 0078), números propostos (o dono ajusta aqui). */
export const BRASS_RING = { slot: "ring", name: "Anel de Latão", defense: 0, ...APPRENTICE_SET } as const;
