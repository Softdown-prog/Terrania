import { capitalPoint } from "../../../../world/center/capital/index.ts";
import type { Npc, NpcAppearance } from "../../../types.ts";

/**
 * Olavo, ancião da Concórdia (ADR 0108): um morador que anda pelas ruas da capital, sem função de jogo, para a cidade ter gente. Vai e volta numa rota reta de rua
 * (a rota fica em `CITIZEN_PATROLS`). O nome e as falas são de trabalho: o dono ajusta, só mudam estas linhas.
 */
export const OLAVO_ID = "capital-morador-olavo";
export const olavoNpc: Npc = { id: OLAVO_ID, kind: "character", name: "Olavo", role: "Ancião", ...capitalPoint(-3, -9) };
export const olavoLook: NpcAppearance = { robe: "#6a6a7a", trim: "#e0e0e8", accent: "#9ab0d0", skin: "#dcb48e", hair: "#e8e8ee", hairStyle: "short", prop: "staff", width: 1.0, beard: "#e8e8ee" };
export const olavoDialogue: readonly string[] = [
  "Vi a Concórdia ser erguida pedra sobre pedra, depois da guerra.",
  "Os humanos ficaram com o Centro. Os outros povos têm as suas terras, e cada um cuida da sua.",
];
/** Quanto anda para cada lado (em tiles) e a fase do passo (para os moradores não andarem todos juntos). */
export const olavoPatrol = { x: 0, y: 2, phase: 4.3 } as const;
