import { capitalPoint } from "../../../../world/center/capital/index.ts";
import type { Npc, NpcAppearance } from "../../../types.ts";

/**
 * Clara, jardineira da Concórdia (ADR 0108): um morador que anda pelas ruas da capital, sem função de jogo, para a cidade ter gente. Vai e volta numa rota reta de rua
 * (a rota fica em `CITIZEN_PATROLS`). O nome e as falas são de trabalho: o dono ajusta, só mudam estas linhas.
 */
export const CLARA_ID = "capital-morador-clara";
export const claraNpc: Npc = { id: CLARA_ID, kind: "character", name: "Clara", role: "Jardineira", ...capitalPoint(8, 15) };
export const claraLook: NpcAppearance = { robe: "#4f8a4a", trim: "#f0e8c8", accent: "#e8a0b4", skin: "#e4ba92", hair: "#8a5a2a", hairStyle: "long", prop: "vial", width: 1.0, apron: "#e8e0c0" };
export const claraDialogue: readonly string[] = [
  "Cuido das árvores dos terrenos vazios. Carvalho, cipreste e cerejeira: cada um no seu canto.",
  "Quando construírem algo aqui, vão tirar as árvores. Eu só peço que plantem outras.",
];
/** Quanto anda para cada lado (em tiles) e a fase do passo (para os moradores não andarem todos juntos). */
export const claraPatrol = { x: 8, y: 0, phase: 0.4 } as const;
