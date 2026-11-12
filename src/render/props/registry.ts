import { SOUTH_SCENERY_PAINTERS } from "../south/sceneryPainters.ts";
import type { SceneryPainter } from "./types.ts";

/**
 * Cadastro de pintores de cenário por região (ADR 0048). `scenery.ts` desenha os tipos comuns (árvore, casa, pedra, arco,
 * placa, fogueira e os marcos regionais); cada tipo que só existe numa região é pintado por um pintor que mora na pasta
 * dela e entra aqui. Região nova: uma linha em `REGION_PAINTERS`, sem mexer em `scenery.ts`.
 */
export type RegionPainters = Readonly<Record<string, SceneryPainter>>;

/** Junta os pintores das regiões num só mapa; dois pintores para o mesmo tipo é erro, para um não esconder o outro em silêncio. */
export function mergePainters(regions: readonly RegionPainters[]): ReadonlyMap<string, SceneryPainter> {
  const merged = new Map<string, SceneryPainter>();
  for (const region of regions)
    for (const [kind, painter] of Object.entries(region)) {
      if (merged.has(kind)) throw new Error(`Dois pintores de cenário para o tipo "${kind}".`);
      merged.set(kind, painter);
    }
  return merged;
}

/** Uma linha por região. */
const REGION_PAINTERS: readonly RegionPainters[] = [SOUTH_SCENERY_PAINTERS];
export const SCENERY_PAINTERS = mergePainters(REGION_PAINTERS);

/** O pintor regional do tipo, ou `undefined` para os tipos comuns (que `scenery.ts` desenha). */
export function regionPainterFor(kind: string): SceneryPainter | undefined { return SCENERY_PAINTERS.get(kind); }
