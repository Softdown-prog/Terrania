import { APPRENTICE_SET } from "./set.ts";

/** O livro de magias do Aprendiz (o escudo do Mago): conjunto do Aprendiz (ADR 0078), números propostos (o dono ajusta aqui). */
export const APPRENTICE_NOTEBOOK = { slot: "shield", name: "Caderno de Feitiços", defense: 0, ...APPRENTICE_SET } as const;
