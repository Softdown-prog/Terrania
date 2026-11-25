import { capitalPoint } from "../../../world/center/capital/index.ts";
import type { Npc, NpcAppearance } from "../../types.ts";

/**
 * A mestra da Academia Arcana (ADR 0074): fica na rua, ao lado da porta, como a hospedeira, o banqueiro e a sacerdotisa, e vende ao Mago o
 * primeiro cajado elemental (o da Brisa). O nome é de trabalho: o dono ajusta, só mudam estas linhas.
 */
export const MAGE_MASTER_ID = "capital-mestra-arcana";
export const mageMasterNpc: Npc = { id: MAGE_MASTER_ID, kind: "character", name: "Mestra Ilvana", role: "Mestra da Academia Arcana", ...capitalPoint(32, -16) };
export const mageMasterLook: NpcAppearance = { robe: "#46358a", trim: "#d9bf7c", accent: "#9d86ff", skin: "#dcb690", hair: "#d5d8e2", hairStyle: "long", prop: "staff", width: 1.02 };
export const mageMasterDialogue: readonly string[] = [
  "Seja bem-vindo à Academia Arcana, viajante. Aqui se estuda o que o mundo guarda por trás dos elementos: o vento, a terra, a água, o fogo.",
  "Quem usa a magia aprende um cajado de cada vez. O da Brisa, o primeiro dos elementais, eu mesma entrego por trinta Terrania Gold; os outros o senhor merece quando a sua mana crescer.",
  "A Academia é dos magos. Se o senhor empunha uma espada, a Ordem dos Cavaleiros é a casa certa. Entre pela porta para ver o salão.",
];
