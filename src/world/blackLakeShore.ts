import { hash2 } from "./random.ts";
import { getWorldRegion } from "./regions.ts";
import { CHUNK_TILES, getTile } from "./terrain.ts";

/**
 * Margens dos lagos negros (ADR 0027): onde um morador pode ficar. Sistema próprio, sem tocar no
 * terreno nem nos marcos regionais. Uma margem é chão livre (sem árvore nem rocha) com água de lago
 * negro a até 2 tiles. Tudo por hash do bloco, barato e determinístico.
 */
const CANDIDATES_PER_CHUNK = 8;
const isLake = (tx: number, ty: number, seed: number): boolean => getTile(tx, ty, seed).biome === "black-lake";

export interface ShoreSpot { readonly tx: number; readonly ty: number; /** Tiles de lago na janela 7×7: o tamanho aproximado do lago ao redor. */ readonly lake: number; }

/** O tile é margem de lago negro? Chão livre com lago a até 2 tiles. */
export function isBlackLakeShore(tx: number, ty: number, seed: number): boolean {
  const here = getTile(tx, ty, seed);
  if (here.ground === "water" || here.tree || here.rock) return false;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++)
    if ((dx || dy) && isLake(tx + dx, ty + dy, seed)) return true;
  return false;
}

/** Quantos tiles de lago negro há na janela 7×7 ao redor. */
export function lakeTilesAround(tx: number, ty: number, seed: number): number {
  let count = 0;
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (isLake(tx + dx, ty + dy, seed)) count++;
  return count;
}

/** Margens de lago neste bloco de 16 tiles, em ordem fixa; vazio fora do Sul. */
export function blackLakeShoreSpots(cx: number, cy: number, seed: number): ShoreSpot[] {
  if (![cx, cy, seed].every(Number.isSafeInteger)) return [];
  if (getWorldRegion(cx * CHUNK_TILES + CHUNK_TILES / 2, cy * CHUNK_TILES + CHUNK_TILES / 2) !== "south") return [];
  const spots: ShoreSpot[] = [];
  for (let i = 0; i < CANDIDATES_PER_CHUNK; i++) {
    const tx = cx * CHUNK_TILES + Math.floor(hash2(cx * 31 + i, cy, seed + 6501) * CHUNK_TILES);
    const ty = cy * CHUNK_TILES + Math.floor(hash2(cx, cy * 37 + i, seed + 6503) * CHUNK_TILES);
    if (!isBlackLakeShore(tx, ty, seed)) continue;
    spots.push({ tx, ty, lake: lakeTilesAround(tx, ty, seed) });
  }
  return spots;
}
