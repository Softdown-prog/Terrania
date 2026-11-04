import { MONSTER_SPECIES } from "../../src/actors/MonsterSpecies.ts";
import { monsterSpawns } from "../../src/actors/MonsterSpawns.ts";

// Deterministic seed and chunk matrix covering tutorial, deep wilderness,
// positive/negative coordinates, and multiple biome combinations.
const seeds = [842136, 8912];
const chunks = [-11, -8, -6, -3, 0, 3, 5, 9, 12];
const samples = [];
for (const seed of seeds) for (const cy of chunks) for (const cx of chunks) {
  samples.push({
    seed, chunk: [cx, cy],
    mobs: monsterSpawns(cx, cy, seed).map(m => ({
      id: m.id, kind: m.kind, x: m.x, y: m.y, hp: m.hp,
    })),
  });
}
console.log(JSON.stringify({ catalog: MONSTER_SPECIES, samples }));
