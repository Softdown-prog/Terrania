import { capitalPoint } from "../../../../world/center/capital/index.ts";
import type { Npc, NpcAppearance } from "../../../types.ts";

/**
 * Dona Cecília, mercadora da Concórdia (ADR 0108): um morador que anda pelas ruas da capital, sem função de jogo, para a cidade ter gente. Vai e volta numa rota reta de rua
 * (a rota fica em `CITIZEN_PATROLS`). O nome e as falas são de trabalho: o dono ajusta, só mudam estas linhas.
 */
export const CECILIA_ID = "capital-morador-cecilia";
export const ceciliaNpc: Npc = { id: CECILIA_ID, kind: "character", name: "Dona Cecília", role: "Mercadora", ...capitalPoint(28, 1) };
export const ceciliaLook: NpcAppearance = { robe: "#8a4a6a", trim: "#f0e6cc", accent: "#e0a73a", skin: "#e6bf98", hair: "#7a4a2c", hairStyle: "bun", prop: "scales", width: 1.05 };
export const ceciliaDialogue: readonly string[] = [
  "Os melhores preços da avenida, e os únicos honestos! Pergunte a qualquer um na Travessia dos Mercadores.",
  "Quem vai à Casa da Moeda guarda as moedas com Mestre Aurélio. Eu, prefiro gastá-las.",
];
/** Quanto anda para cada lado (em tiles) e a fase do passo (para os moradores não andarem todos juntos). */
export const ceciliaPatrol = { x: 5, y: 0, phase: 1.7 } as const;
