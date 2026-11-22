import { capitalPoint } from "../../../world/center/capital/index.ts";
import type { Npc, NpcAppearance } from "../../types.ts";

/**
 * A sacerdotisa do Templo da Concórdia (ADR 0064): fica na rua, ao lado da porta, e consagra o Templo como o lugar onde o herói renasce.
 * O nome é de trabalho: o dono ajusta, só mudam estas linhas. É também onde uma futura missão do Templo pode começar.
 */
export const PRIESTESS_ID = "capital-sacerdotisa";
export const priestessNpc: Npc = { id: PRIESTESS_ID, kind: "character", name: "Irmã Maelis", role: "Sacerdotisa", ...capitalPoint(32, -1) };
export const priestessLook: NpcAppearance = { robe: "#e7e1d1", trim: "#d8b04a", accent: "#7ea6c9", skin: "#e0b891", hair: "#caa66a", hairStyle: "long", prop: "staff", width: 1.02 };
export const priestessDialogue: readonly string[] = [
  "A paz da Concórdia, viajante. Este é o Templo dos cinco povos, onde a luz do sol dourado nunca se apaga.",
  "Quando a vida lhe falta, é daqui que a luz pode chamá-lo de volta, se o senhor consagrar este templo como o seu lar.",
  "Escolha onde quer renascer: aqui, à porta do Templo, ou na Vila da Travessia. A escolha vale até o senhor mudar de ideia.",
];
