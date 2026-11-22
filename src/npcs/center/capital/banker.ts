import { capitalPoint } from "../../../world/center/capital/index.ts";
import type { Npc, NpcAppearance } from "../../types.ts";

/**
 * O banqueiro da Casa da Moeda e dos Mercadores (ADR 0063): fica na rua, ao lado da porta, como Dona Brígida na Hospedaria, e guarda o
 * dinheiro do herói com juros. O nome é de trabalho: o dono ajusta, só mudam estas linhas.
 */
export const BANKER_ID = "capital-banqueiro";
export const bankerNpc: Npc = { id: BANKER_ID, kind: "character", name: "Mestre Aurélio", role: "Banqueiro", ...capitalPoint(19, -1) };
export const bankerLook: NpcAppearance = { robe: "#2f4a55", trim: "#e0b84a", accent: "#e0b84a", skin: "#d9b48c", hair: "#9b9a98", hairStyle: "short", prop: "scales", width: 1.02, beard: "#9b9a98" };
export const bankerDialogue: readonly string[] = [
  "Bem-vindo à Casa da Moeda e dos Mercadores. Aqui o ouro dorme em segurança, e dormindo ainda rende.",
  "Guardo o seu dinheiro no cofre: meio por cento a cada dez minutos de aventura, sobre os primeiros dez mil Terrania Gold do saldo.",
  "Os juros entram na sua conta sempre que o senhor vem falar comigo, até um dia inteiro de jogo acumulado. Entre pela porta para ver o balcão.",
];
