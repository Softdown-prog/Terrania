import { DEFAULT_RESPAWN_POINT, RESPAWN_POINT_IDS, type RespawnPointId } from "./points.ts";

/** Ponto de renascimento vindo do save (ou de qualquer lugar): só vale um dos conhecidos; o resto volta à Vila. */
export function normalizeRespawnPoint(value: unknown): RespawnPointId {
  return RESPAWN_POINT_IDS.find(id => id === value) ?? DEFAULT_RESPAWN_POINT;
}
