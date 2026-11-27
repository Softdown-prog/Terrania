import { capitalPoint } from "../../../../world/center/capital/index.ts";
import type { Npc, NpcAppearance } from "../../../types.ts";

/**
 * Tomé, remendão da Concórdia (ADR 0108): um morador que anda pelas ruas da capital, sem função de jogo, para a cidade ter gente. Vai e volta numa rota reta de rua
 * (a rota fica em `CITIZEN_PATROLS`). O nome e as falas são de trabalho: o dono ajusta, só mudam estas linhas.
 */
export const TOME_ID = "capital-morador-tome";
export const tomeNpc: Npc = { id: TOME_ID, kind: "character", name: "Tomé", role: "Remendão", ...capitalPoint(-26, -1) };
export const tomeLook: NpcAppearance = { robe: "#7a5a3a", trim: "#d9c9a0", accent: "#c08a3a", skin: "#dfb48a", hair: "#4a3524", hairStyle: "short", prop: "hammer", width: 1.0, apron: "#a8794a" };
export const tomeDialogue: readonly string[] = [
  "Remendo botas, selas e o que mais vier, aqui entre a Travessia dos Ferreiros e a praça.",
  "Antes da guerra eu consertava carroças. Hoje conserto o que os exploradores trazem rasgado das viagens.",
];
/** Quanto anda para cada lado (em tiles) e a fase do passo (para os moradores não andarem todos juntos). */
export const tomePatrol = { x: 6, y: 0, phase: 0.0 } as const;
