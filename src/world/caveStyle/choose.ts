import { hash2 } from "../random.ts";
import type { CaveEntrance } from "../caves.ts";
import type { CaveStyle } from "./style.ts";

/** Fração das cavernas comuns que ganham a Gruta Luminosa. */
export const LUMINOUS_SHARE = 0.35;

/**
 * Qual aparência esta entrada tem. Determinística (posição e semente da própria entrada) e igual em
 * todos os andares. A gruta de treino e as torres ficam sempre como são, e a escolha usa um sal próprio:
 * nenhuma posição, planta ou criatura existente muda.
 */
export function caveStyleFor(entrance: Pick<CaveEntrance, "id" | "seed" | "tileX" | "tileY" | "tower">): CaveStyle {
  if (entrance.tower) return "plain";
  if (entrance.id === `cave:${entrance.seed}:0:0`) return "plain";
  return hash2(entrance.tileX, entrance.tileY, entrance.seed + 4421) < LUMINOUS_SHARE ? "luminous" : "plain";
}
