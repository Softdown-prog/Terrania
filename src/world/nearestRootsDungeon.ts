import { CAVE_CELL_TILES, caveEntranceInCell, isStarterCave, type CaveEntrance } from "./caves.ts";

/** Até quantas células de 96 tiles em volta a procura vai (9 × 9 células): sempre há uma gruta verde perto no Centro. */
const SEARCH_CELLS = 4;

/**
 * A Masmorra das Raízes mais perto de um ponto (ADR 0104): a gruta verde, fora a de treinamento da Aela. Serve ao guia do diário de missões
 * ("a entrada da Masmorra das Raízes mais perto"). Devolve `null` se não há nenhuma nas células em volta ou se o ponto é inválido.
 */
export function nearestRootsDungeon(seed: number, tileX: number, tileY: number): CaveEntrance | null {
  if (![seed, tileX, tileY].every(Number.isFinite)) return null;
  const cx = Math.floor(tileX / CAVE_CELL_TILES), cy = Math.floor(tileY / CAVE_CELL_TILES);
  let best: CaveEntrance | null = null, bestDistance = Infinity;
  for (let dx = -SEARCH_CELLS; dx <= SEARCH_CELLS; dx++) for (let dy = -SEARCH_CELLS; dy <= SEARCH_CELLS; dy++) {
    const entrance = caveEntranceInCell(cx + dx, cy + dy, seed);
    if (!entrance || entrance.theme !== "verdant" || isStarterCave(entrance)) continue; // as torres são sempre do deserto: o tema já as deixa de fora
    const distance = Math.hypot(entrance.tileX - tileX, entrance.tileY - tileY);
    if (distance < bestDistance) { best = entrance; bestDistance = distance; }
  }
  return best;
}
