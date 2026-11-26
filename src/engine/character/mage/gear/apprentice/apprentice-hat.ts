import { APPRENTICE_SET } from "./set.ts";

/** O chapéu pontudo azul-noite (sem bônus): conjunto do Aprendiz (ADR 0078), números propostos (o dono ajusta aqui). */
export const APPRENTICE_HAT = { slot: "head", name: "Chapéu de Aprendiz", defense: 0, ...APPRENTICE_SET } as const;
