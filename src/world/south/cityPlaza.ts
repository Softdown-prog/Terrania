import { SOUTH_CITY } from "../southCity.ts";

/**
 * Praça do Poço Negro (ADR 0042): o quadrado de 13 × 13 tiles em volta do poço. É geometria do mundo (onde fica o
 * poço e quais anéis de pedra o cercam); como o piso é pintado só pelo desenho, ela não muda colisão nem terreno.
 */
export const PLAZA_HALF_TILES = 6;
/** Centro do poço em pixels do mundo. */
export const PLAZA_CENTER = { x: 16, y: (SOUTH_CITY.centerY + 0.5) * 32 } as const;
/** Anéis de pedra de bronze embutidos no piso: raio até o meio da faixa e meia largura, em pixels. */
export const PLAZA_RINGS: readonly { readonly radius: number; readonly half: number }[] = [
  { radius: 96, half: 5 },
  { radius: 164, half: 4 },
];

/** O tile (coordenadas globais) está dentro da praça? */
export function isSouthCityPlaza(tx: number, ty: number): boolean {
  if (!Number.isSafeInteger(tx) || !Number.isSafeInteger(ty)) return false;
  return Math.abs(tx) <= PLAZA_HALF_TILES && Math.abs(ty - SOUTH_CITY.centerY) <= PLAZA_HALF_TILES;
}

/** Quanto um ponto do mundo (px) está sobre um anel de bronze: 1 no meio da faixa, 0 fora dela. */
export function plazaRingStrength(px: number, py: number): number {
  if (![px, py].every(Number.isFinite)) return 0;
  const d = Math.hypot(px - PLAZA_CENTER.x, py - PLAZA_CENTER.y);
  let best = 0;
  for (const ring of PLAZA_RINGS) best = Math.max(best, Math.max(0, 1 - Math.abs(d - ring.radius) / ring.half));
  return best;
}
