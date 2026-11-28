import { capitalPoint } from "../../../world/center/capital/index.ts";
import type { Npc, NpcAppearance } from "../../types.ts";

/**
 * O mestre da Irmandade dos Arqueiros (ADR 0118): fica na rua, a oeste da porta, como a mestra da Academia e a sacerdotisa, e vende ao Arqueiro as flechas
 * (Junco e Ferro, em pacotes de 10). O nome é de trabalho: o dono ajusta, só mudam estas linhas.
 */
export const ARCHER_MASTER_ID = "capital-mestre-arqueiro";
export const archerMasterNpc: Npc = { id: ARCHER_MASTER_ID, kind: "character", name: "Mestre Orlan", role: "Mestre da Irmandade dos Arqueiros", ...capitalPoint(-34, -1) };
export const archerMasterLook: NpcAppearance = { robe: "#3f5a34", trim: "#c9a24e", accent: "#a8482a", skin: "#d2a77f", hair: "#8d8a82", hairStyle: "short", prop: "dagger", width: 1.04, beard: "#9a968a" };
export const archerMasterDialogue: readonly string[] = [
  "Bem-vindo à Irmandade dos Arqueiros, viajante. Aqui se ensina a respirar fundo, mirar longe e soltar a corda no tempo certo.",
  "Quem leva o arco precisa de flechas, e flecha acaba. A de junco eu entrego por uma moeda de ouro cada; a de ferro, mais pesada e mais certeira, por três. Vendo em pacotes de dez.",
  "A Irmandade é dos arqueiros. Se o senhor empunha uma espada ou um cajado, a Ordem dos Cavaleiros e a Academia Arcana são as casas certas. Entre pela porta para ver o salão.",
];
