import { capitalPoint } from "../../../../world/center/capital/index.ts";
import type { Npc, NpcAppearance } from "../../../types.ts";

/**
 * Inês, cantora da Concórdia (ADR 0108): um morador que anda pelas ruas da capital, sem função de jogo, para a cidade ter gente. Vai e volta numa rota reta de rua
 * (a rota fica em `CITIZEN_PATROLS`). O nome e as falas são de trabalho: o dono ajusta, só mudam estas linhas.
 */
export const INES_ID = "capital-morador-ines";
export const inesNpc: Npc = { id: INES_ID, kind: "character", name: "Inês", role: "Cantora", ...capitalPoint(2, 21) };
export const inesLook: NpcAppearance = { robe: "#a8523a", trim: "#f6e3b0", accent: "#e86a8a", skin: "#e8c09a", hair: "#2a1a14", hairStyle: "long", prop: "lantern", width: 0.98 };
export const inesDialogue: readonly string[] = [
  "Canto na avenida quando o sol está alto. Hoje é a canção dos cinco povos.",
  "Cada povo ficou com a sua terra depois da guerra, mas a canção é a mesma em todas.",
];
/** Quanto anda para cada lado (em tiles) e a fase do passo (para os moradores não andarem todos juntos). */
export const inesPatrol = { x: 0, y: 4, phase: 2.6 } as const;
