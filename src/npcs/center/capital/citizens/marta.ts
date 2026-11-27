import { capitalPoint } from "../../../../world/center/capital/index.ts";
import type { Npc, NpcAppearance } from "../../../types.ts";

/**
 * Marta, guarda da muralha da Concórdia (ADR 0108): um morador que anda pelas ruas da capital, sem função de jogo, para a cidade ter gente. Vai e volta numa rota reta de rua
 * (a rota fica em `CITIZEN_PATROLS`). O nome e as falas são de trabalho: o dono ajusta, só mudam estas linhas.
 */
export const MARTA_ID = "capital-morador-marta";
export const martaNpc: Npc = { id: MARTA_ID, kind: "character", name: "Marta", role: "Guarda da muralha", ...capitalPoint(17, -1) };
export const martaLook: NpcAppearance = { robe: "#2f5fa8", trim: "#d8d8de", accent: "#d8b04a", skin: "#d9ab84", hair: "#5a3a28", hairStyle: "short", prop: "dagger", width: 1.06 };
export const martaDialogue: readonly string[] = [
  "Boa tarde, viajante. A lei da cidade vale aqui dentro: dentro das muralhas, ninguém luta.",
  "Os monstros ficam do lado de fora, e a Guarda cuida para que fiquem lá.",
];
/** Quanto anda para cada lado (em tiles) e a fase do passo (para os moradores não andarem todos juntos). */
export const martaPatrol = { x: 3.5, y: 0, phase: 5.1 } as const;
