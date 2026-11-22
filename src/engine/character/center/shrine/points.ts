import { capitalPoint } from "../../../../world/center/capital/index.ts";
import { VILLAGE_RESPAWN } from "../../../../world/village.ts";

/**
 * Onde o herói pode renascer (ADR 0064). Ele começa na Vila da Travessia; ao consagrar o Templo da Concórdia com a sacerdotisa,
 * passa a renascer à porta do Templo, até escolher a Vila de novo. O Templo fica a uns 800 tiles da Vila, por isso a escolha é do jogador.
 */
export type RespawnPointId = "village" | "capital-temple";
export interface RespawnPoint { readonly id: RespawnPointId; readonly name: string; readonly x: number; readonly y: number }

export const DEFAULT_RESPAWN_POINT: RespawnPointId = "village";
/** À frente da porta do Templo, na rua e ao lado da sacerdotisa. */
const temple = capitalPoint(30, -1);

export const RESPAWN_POINTS: Readonly<Record<RespawnPointId, RespawnPoint>> = {
  village: { id: "village", name: "Vila da Travessia", x: VILLAGE_RESPAWN.x, y: VILLAGE_RESPAWN.y },
  "capital-temple": { id: "capital-temple", name: "Templo da Concórdia", x: temple.x, y: temple.y },
};
export const RESPAWN_POINT_IDS: readonly RespawnPointId[] = ["village", "capital-temple"];
