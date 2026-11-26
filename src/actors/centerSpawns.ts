import { RegionalMonster } from "./RegionalMonster.ts";
import { CENTER_WILD_KINDS, CREATURE_CATALOG } from "../monsters/catalog.ts";
import { getBiomeAt } from "../world/biomes.ts";
import { canWalkOnSeed } from "../world/collision.ts";
import { hash2 } from "../world/random.ts";
import { getWorldRegion } from "../world/regions.ts";
import { CHUNK_TILES, TILE_SIZE } from "../world/terrain.ts";
import { protectedSurfaceTile } from "../world/village.ts";

/**
 * Os bichos "médios" do Centro (javali, lobo cinzento e cogumelo andante, ADR 0089) andam pela superfície, mas só **longe da vila**: quem acabou de nascer encontra
 * slimes por perto e só topa com eles depois de se afastar. A distância é em tiles a partir da Vila da Travessia, no tile (0, 0).
 */
export const CENTER_WILD_MIN_TILES = 240;
/** Fração dos blocos (chunks de 16 × 16 tiles) do Centro, além dessa distância, que recebem um encontro. */
export const CENTER_WILD_CHANCE = .2;
/** A matilha de lobos: dois, e às vezes três, a poucos tiles uns dos outros. */
export const WOLF_PACK_MAX_SPREAD_TILES = 3;

/**
 * Um encontro por bloco (no máximo), do povo do Centro que mora naquele bioma. O mundo é o mesmo para a mesma semente: o bloco, a semente e o sorteio decidem tudo,
 * sem relógio nem aleatório. Os ids são estáveis (`center-wild:<semente>:<bloco>:<n>`), então o derrotado só volta pelo prazo normal da simulação.
 */
export function centerSurfaceSpawns(cx: number, cy: number, seed: number): RegionalMonster[] {
  if (![cx, cy, seed].every(Number.isSafeInteger)) return [];
  const midX = cx * CHUNK_TILES + CHUNK_TILES / 2, midY = cy * CHUNK_TILES + CHUNK_TILES / 2;
  if (Math.hypot(midX, midY) < CENTER_WILD_MIN_TILES || hash2(cx, cy, seed + 31001) > CENTER_WILD_CHANCE) return [];
  const spot = (tx: number, ty: number): boolean => getWorldRegion(tx, ty) === "center" && !protectedSurfaceTile(tx, ty) && canWalkOnSeed((tx + .5) * TILE_SIZE, (ty + .5) * TILE_SIZE, seed);
  const tx = cx * CHUNK_TILES + Math.floor(hash2(cx * 7, cy, seed + 31007) * CHUNK_TILES);
  const ty = cy * CHUNK_TILES + Math.floor(hash2(cx, cy * 7, seed + 31013) * CHUNK_TILES);
  if (!spot(tx, ty)) return [];
  const biome = getBiomeAt(tx, ty, seed);
  const eligible = CENTER_WILD_KINDS.filter(kind => CREATURE_CATALOG[kind].biomes.includes(biome));
  if (!eligible.length) return [];
  const kind = eligible[Math.floor(hash2(cx, cy * 11, seed + 31019) * eligible.length)]!;
  const id = (n: number): string => `center-wild:${seed}:${cx}:${cy}:${n}`;
  const out = [new RegionalMonster(id(0), kind, (tx + .5) * TILE_SIZE, (ty + .5) * TILE_SIZE)];
  if (kind === "gray-wolf") {
    // Cada lobo da matilha procura (em até seis tentativas) um tile livre perto do primeiro, sempre dentro do mesmo bloco; o id é o número do lobo na matilha.
    const pack = hash2(cx, cy, seed + 31023) < .4 ? 3 : 2, minX = cx * CHUNK_TILES, minY = cy * CHUNK_TILES, clamp = (value: number, low: number): number => Math.max(low, Math.min(low + CHUNK_TILES - 1, value));
    for (let n = 1; n < pack; n++) for (let attempt = 0; attempt < 6; attempt++) {
      const px = clamp(tx + Math.round((hash2(cx + n * 3 + attempt, cy, seed + 31029) * 2 - 1) * WOLF_PACK_MAX_SPREAD_TILES), minX);
      const py = clamp(ty + Math.round((hash2(cx, cy + n * 3 + attempt, seed + 31031) * 2 - 1) * WOLF_PACK_MAX_SPREAD_TILES), minY);
      if (!spot(px, py) || !CREATURE_CATALOG[kind].biomes.includes(getBiomeAt(px, py, seed)) || out.some(w => Math.floor(w.x / TILE_SIZE) === px && Math.floor(w.y / TILE_SIZE) === py)) continue;
      out.push(new RegionalMonster(id(n), kind, (px + .5) * TILE_SIZE, (py + .5) * TILE_SIZE));
      break;
    }
  }
  return out;
}
