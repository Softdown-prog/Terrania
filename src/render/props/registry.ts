import { CENTER_SCENERY_PAINTERS, CENTER_SPRITE_RELEASERS, CENTER_SPRITE_WARMERS } from "../center/sceneryPainters.ts";
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
const REGION_PAINTERS: readonly RegionPainters[] = [SOUTH_SCENERY_PAINTERS, CENTER_SCENERY_PAINTERS];
export const SCENERY_PAINTERS = mergePainters(REGION_PAINTERS);

/** O pintor regional do tipo, ou `undefined` para os tipos comuns (que `scenery.ts` desenha). */
export function regionPainterFor(kind: string): SceneryPainter | undefined { return SCENERY_PAINTERS.get(kind); }

/** Um preparador de sprites de uma região: pinta, no máximo, um sprite grande por chamada e devolve se pintou. */
export type SpriteWarmer = (cameraX: number, cameraY: number) => boolean;
/** Os preparadores das regiões, uma linha por região que tenha sprites grandes (ADR 0058). */
const REGION_WARMERS: readonly SpriteWarmer[] = [...CENTER_SPRITE_WARMERS];

/** Prepara, no máximo, um sprite grande de cenário por chamada (uma por quadro), perto de onde a câmera está. Devolve se pintou. */
export function warmRegionSprites(cameraX: number, cameraY: number): boolean {
  for (const warm of REGION_WARMERS) if (warm(cameraX, cameraY)) return true;
  return false;
}

/** Um soltador de sprites de uma região: solta o que está longe demais da câmera e devolve quantos soltou. */
export type SpriteReleaser = (cameraX: number, cameraY: number, width: number, height: number) => number;
/** Os soltadores das regiões, uma linha por região que tenha sprites grandes (ADR 0061). */
const REGION_RELEASERS: readonly SpriteReleaser[] = [...CENTER_SPRITE_RELEASERS];

/** Chama cada soltador e soma o que soltaram (separado de `releaseRegionSprites` para valer para várias regiões). */
export function releaseWith(releasers: readonly SpriteReleaser[], cameraX: number, cameraY: number, width: number, height: number): number {
  let released = 0;
  for (const release of releasers) released += release(cameraX, cameraY, width, height);
  return released;
}

/** Solta da memória os sprites grandes de cenário de toda região que ficou longe da câmera. Devolve quantos soltou. */
export function releaseRegionSprites(cameraX: number, cameraY: number, width: number, height: number): number {
  return releaseWith(REGION_RELEASERS, cameraX, cameraY, width, height);
}
