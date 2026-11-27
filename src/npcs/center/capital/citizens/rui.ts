import { capitalPoint } from "../../../../world/center/capital/index.ts";
import type { Npc, NpcAppearance } from "../../../types.ts";

/**
 * Rui, aprendiz da Concórdia (ADR 0108): um morador que anda pelas ruas da capital, sem função de jogo, para a cidade ter gente. Vai e volta numa rota reta de rua
 * (a rota fica em `CITIZEN_PATROLS`). O nome e as falas são de trabalho: o dono ajusta, só mudam estas linhas.
 */
export const RUI_ID = "capital-morador-rui";
export const ruiNpc: Npc = { id: RUI_ID, kind: "character", name: "Rui", role: "Aprendiz", ...capitalPoint(-17, 1) };
export const ruiLook: NpcAppearance = { robe: "#3f6a8a", trim: "#cfe0ec", accent: "#8fd0e8", skin: "#e2b78e", hair: "#2f2a24", hairStyle: "short", prop: "scroll", width: 0.94 };
export const ruiDialogue: readonly string[] = [
  "Sou aprendiz de escriba. Levo recados entre os edifícios da Cidadela, e ando depressa para não me atrasar.",
  "Dizem que a Academia Arcana ensina quem tem o dom. Eu só tenho boa letra.",
];
/** Quanto anda para cada lado (em tiles) e a fase do passo (para os moradores não andarem todos juntos). */
export const ruiPatrol = { x: 3.5, y: 0, phase: 3.4 } as const;
