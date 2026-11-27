import { capitalPoint } from "../../../../world/center/capital/index.ts";
import type { Npc, NpcAppearance } from "../../../types.ts";

/**
 * Bento, carregador da Concórdia (ADR 0108): um morador que anda pelas ruas da capital, sem função de jogo, para a cidade ter gente. Vai e volta numa rota reta de rua
 * (a rota fica em `CITIZEN_PATROLS`). O nome e as falas são de trabalho: o dono ajusta, só mudam estas linhas.
 */
export const BENTO_ID = "capital-morador-bento";
export const bentoNpc: Npc = { id: BENTO_ID, kind: "character", name: "Bento", role: "Carregador", ...capitalPoint(-2, -22) };
export const bentoLook: NpcAppearance = { robe: "#6a7a4a", trim: "#d8d0b0", accent: "#b8a050", skin: "#d6a982", hair: "#3a2a1a", hairStyle: "bald", prop: "vial", width: 1.12, beard: "#3a2a1a" };
export const bentoDialogue: readonly string[] = [
  "Caixas, sacos e barris: desço e subo a Grande Avenida o dia inteiro.",
  "Do Portão do Norte à praça são cento e tantos passos. Eu conto todos.",
];
/** Quanto anda para cada lado (em tiles) e a fase do passo (para os moradores não andarem todos juntos). */
export const bentoPatrol = { x: 0, y: 5, phase: 0.9 } as const;
