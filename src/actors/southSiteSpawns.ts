import { RegionalMonster } from "./RegionalMonster.ts";
import { HYDRA_MIN_LAKE_TILES, LAKE_DWELLERS, RUIN_DWELLERS, RUIN_RESIDENTS, type SiteResident } from "../monsters/sites/south/index.ts";
import { blackLakeShoreSpots } from "../world/blackLakeShore.ts";
import { canMoveOnSeed } from "../world/collision.ts";
import { hash2 } from "../world/random.ts";
import { CHUNK_TILES, TILE_SIZE } from "../world/terrain.ts";
import { southRuinsInArea } from "../world/southRuins.ts";
import { protectedSurfaceTile } from "../world/village.ts";

/**
 * Moradores dos lugares do Sul (ADR 0027): as margens dos lagos negros e as ruínas abandonadas deixam
 * de ser cenário vazio. Um sistema à parte do povoamento comum (`southCommonSpawns`): a posição vem do
 * lugar, não do bioma, e cada morador tem id próprio e estável.
 */
const MAX_PER_CHUNK_LAKE = 2;
const pickResident = (residents: readonly SiteResident[], roll: number): SiteResident => {
  const total = residents.reduce((sum, r) => sum + r.weight, 0);
  let left = roll * total;
  for (const resident of residents) { left -= resident.weight; if (left < 0) return resident; }
  return residents[residents.length - 1]!;
};
const usable = (tx: number, ty: number, seed: number): boolean =>
  !protectedSurfaceTile(tx, ty) && canMoveOnSeed((tx + .5) * TILE_SIZE, (ty + .5) * TILE_SIZE, seed);

export function southSiteSpawns(cx: number, cy: number, seed: number): RegionalMonster[] {
  if (![cx, cy, seed].every(Number.isSafeInteger)) return [];
  const out: RegionalMonster[] = [];
  // Margens dos lagos: no máximo dois moradores por bloco; a hidra só nos lagos grandes.
  let lakeCount = 0;
  for (const [i, spot] of blackLakeShoreSpots(cx, cy, seed).entries()) {
    if (lakeCount >= MAX_PER_CHUNK_LAKE || hash2(cx * 5 + i, cy, seed + 6511) > .55 || !usable(spot.tx, spot.ty, seed)) continue;
    const pool = LAKE_DWELLERS.filter(r => r.kind !== "mire-hydra" || spot.lake >= HYDRA_MIN_LAKE_TILES);
    const kind = pickResident(pool, hash2(cx, cy * 5 + i, seed + 6517)).kind;
    out.push(new RegionalMonster(`south-site:${seed}:lake:${cx}:${cy}:${i}`, kind, (spot.tx + .5) * TILE_SIZE, (spot.ty + .5) * TILE_SIZE));
    lakeCount++;
  }
  // Ruínas: cada ruína do bloco tem dois moradores, à frente das peças sólidas.
  const x0 = cx * CHUNK_TILES, y0 = cy * CHUNK_TILES;
  for (const ruin of southRuinsInArea(x0, y0, x0 + CHUNK_TILES - 1, y0 + CHUNK_TILES - 1, seed)) {
    let placed = 0;
    for (let attempt = 0; attempt < 12 && placed < RUIN_RESIDENTS; attempt++) {
      const side = hash2(attempt, placed, seed + 6521 + ruin.tileX) < .5 ? -1 : 1;
      const dx = side * (2 + Math.floor(hash2(attempt, ruin.tileY, seed + 6523) * 4));
      const dy = 1 + Math.floor(hash2(ruin.tileX, attempt, seed + 6527) * 3);
      const tx = ruin.tileX + dx, ty = ruin.tileY + dy;
      if (!usable(tx, ty, seed)) continue;
      const kind = pickResident(RUIN_DWELLERS, hash2(placed, ruin.tileX + ruin.tileY, seed + 6529)).kind;
      out.push(new RegionalMonster(`south-site:${seed}:ruin:${ruin.id}:${placed}`, kind, (tx + .5) * TILE_SIZE, (ty + .5) * TILE_SIZE));
      placed++;
    }
  }
  return out;
}
