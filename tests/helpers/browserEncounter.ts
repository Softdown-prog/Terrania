import { Slime, slimeSpawns } from "../../src/actors/Slime.ts";
import { OfflineSimulation } from "../../src/engine/OfflineSimulation.ts";
import { clearPath } from "../../src/engine/TapNavigator.ts";
import { SeedCollision } from "../../src/world/collision.ts";

export const SEED = 842136;
const STILL = { x: 0, y: 0 };
type Point = { x: number; y: number };

/** Find a real, naturally generated monster rather than faking the Angular list. */
export function browserEncounter(): { hero: Point; mob: Slime } {
  const world = new SeedCollision(SEED);
  const offsets = [
    { x: -100, y: 0 }, { x: 100, y: 0 },
    { x: 0, y: -100 }, { x: 0, y: 100 },
    { x: -76, y: -76 }, { x: 76, y: 76 },
  ];
  for (let cy = -2; cy <= 2; cy++) for (let cx = -2; cx <= 2; cx++)
    for (const mob of slimeSpawns(cx, cy, SEED)) for (const o of offsets) {
      const hero = { x: mob.x + o.x, y: mob.y + o.y };
      if (!world.canMove(hero.x, hero.y) || !clearPath(hero, mob, world)) continue;
      const sim = new OfflineSimulation(SEED, {
        seed: SEED, x: hero.x, y: hero.y, hp: 100, kills: 0, defeated: [],
      });
      sim.update(1 / 60, STILL, false);
      if (sim.slimes.has(mob.id)) return { hero, mob };
    }
  throw Error("No naturally spawned slime with a safe browser encounter");
}

