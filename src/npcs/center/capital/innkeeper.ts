import { capitalPoint } from "../../../world/center/capital/index.ts";
import type { Npc, NpcAppearance } from "../../types.ts";

/**
 * A hospedeira da Hospedaria dos Viajantes (ADR 0062): fica na rua, ao lado da porta, como Madame Víbora no Poço Negro, e
 * vende o descanso pago (vida cheia, sem veneno nem queimadura). O nome é de trabalho: o dono ajusta, só mudam estas linhas.
 */
export const INNKEEPER_ID = "capital-hospedeira";
export const innkeeperNpc: Npc = { id: INNKEEPER_ID, kind: "character", name: "Dona Brígida", role: "Hospedeira", ...capitalPoint(-15, -1) };
export const innkeeperLook: NpcAppearance = { robe: "#a8523a", trim: "#f0e6cc", accent: "#e0a73a", skin: "#e6bf98", hair: "#6a3f2c", hairStyle: "bun", prop: "lantern", width: 1.04, apron: "#f0e6cc" };
export const innkeeperDialogue: readonly string[] = [
  "Seja bem-vindo à Hospedaria dos Viajantes! Aqui param os que chegam à Concórdia e os que partem para o mundo.",
  "Uma cama limpa, um prato quente e a vida de volta ao normal, sem veneno nem queimadura: é o descanso da casa.",
  "Entre pela porta atrás de mim para ver o salão, ou descanse agora mesmo, por uma pequena quantia.",
];
