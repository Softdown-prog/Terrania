import { APPRENTICE_SET } from "./set.ts";

/** A túnica azul-violeta com manto (defesa 1, a única do conjunto): conjunto do Aprendiz (ADR 0078), números propostos (o dono ajusta aqui). */
export const APPRENTICE_ROBE = { slot: "chest", name: "Túnica de Aprendiz", defense: 1, ...APPRENTICE_SET } as const;
