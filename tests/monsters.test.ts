import assert from "node:assert/strict";
import test from "node:test";
import { Monster } from "../src/actors/Monster.ts";
import { MONSTER_SPECIES } from "../src/actors/MonsterSpecies.ts";
import { monsterSpawns } from "../src/actors/MonsterSpawns.ts";
import { slimeSpawns } from "../src/actors/Slime.ts";
import { Player } from "../src/actors/Player.ts";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { Inventory, MAX_STACK } from "../src/engine/Inventory.ts";
import { normalizeDrops } from "../src/engine/loot.ts";

const SEED = 842136;
const STILL = { x: 0, y: 0 };
const OPEN = { canMove: () => true };

test("catálogo possui 3 espécies com identidade, drops e XP diferentes", () => {
  assert.deepEqual(Object.keys(MONSTER_SPECIES).sort(), ["slime", "spider", "wolf"]);
  assert.equal(MONSTER_SPECIES.slime.xp, 10);
  assert.equal(MONSTER_SPECIES.wolf.hp, 3);
  assert.equal(MONSTER_SPECIES.wolf.xp, 20);
  assert.equal(MONSTER_SPECIES.spider.xp, 15);
  assert.deepEqual([MONSTER_SPECIES.slime.drop, MONSTER_SPECIES.wolf.drop,
    MONSTER_SPECIES.spider.drop], ["gel", "fang", "silk"]);
});

test("seed preserva slimes originais perto da vila e encontra ambas espécies longe", () => {
  for (let cy = -2; cy <= 2; cy++) for (let cx = -2; cx <= 2; cx++) {
    const original = slimeSpawns(cx, cy, SEED).map(m => [m.id, m.x, m.y]);
    const actual = monsterSpawns(cx, cy, SEED).map(m => [m.id, m.x, m.y]);
    assert.deepEqual(actual, original);
  }
  const found = new Set<string>();
  for (let cy = -20; cy <= 20; cy++) for (let cx = -20; cx <= 20; cx++) {
    const a = monsterSpawns(cx, cy, SEED);
    const b = monsterSpawns(cx, cy, SEED);
    assert.deepEqual(a.map(m => [m.kind, m.id, m.x, m.y]),
      b.map(m => [m.kind, m.id, m.x, m.y]));
    for (const mob of a) found.add(mob.kind);
  }
  assert.deepEqual([...found].sort(), ["slime", "spider", "wolf"]);
});

test("IA de lobo e aranha persegue, respeita colisão e aplica dano próprio", () => {
  for (const kind of ["wolf", "spider"] as const) {
    const player = new Player();
    player.x = 3000; player.y = 3000;
    const mob = new Monster(kind, "test-" + kind, 3045, 3000);
    const start = mob.x;
    mob.update(0.05, player, OPEN);
    assert.ok(mob.x < start, kind + " deveria perseguir");
    mob.x = player.x + 19; mob.y = player.y;
    mob.update(0.05, player, OPEN);
    assert.equal(player.hp, 100 - MONSTER_SPECIES[kind].damage);
    assert.ok(mob.contactCooldown > 0);
    mob.update(0.05, player, OPEN);
    assert.equal(player.hp, 100 - MONSTER_SPECIES[kind].damage);
    const blocked = new Monster(kind, "wall-" + kind, 3045, 3000);
    blocked.update(0.05, player, { canMove: (x) => x >= 3045 });
    assert.ok(blocked.x >= 3045);
  }
});

test("abates reais rendem XP e material individual, não avançam missão da Aela", () => {
  for (const kind of ["wolf", "spider"] as const) {
    const sim = new OfflineSimulation(SEED);
    sim.update(0, STILL, false);
    sim.slimes.clear();
    const mob = new Monster(kind, kind + "-kill", 50, 16);
    mob.hp = 1;
    sim.slimes.set(mob.id, mob);
    sim.player.faceX = 1; sim.player.faceY = 0;
    sim.update(1 / 60, STILL, true);
    for (let i = 0; i < 20; i++) sim.update(1 / 60, STILL, false);
    assert.equal(sim.kills, 1);
    assert.equal(sim.slimeKills, 0);
    assert.equal(sim.experience, MONSTER_SPECIES[kind].xp);
    assert.equal(sim.drops.get(mob.id)?.item, MONSTER_SPECIES[kind].drop);
    assert.equal(sim.inventory.claimAelaReward(sim.slimeKills), false);
    const save = sim.snapshot();
    const recovered = new OfflineSimulation(SEED, save);
    assert.equal(recovered.experience, sim.experience);
    assert.equal(recovered.slimeKills, 0);
    assert.equal(recovered.drops.get(mob.id)?.item, MONSTER_SPECIES[kind].drop);
    recovered.player.x = mob.x; recovered.player.y = mob.y;
    recovered.update(1 / 60, STILL, false);
    assert.equal(recovered.drops.size, 0);
    assert.equal(kind === "wolf" ? recovered.inventory.fang : recovered.inventory.silk, 1);
    const next = new OfflineSimulation(SEED, recovered.snapshot());
    assert.equal(kind === "wolf" ? next.inventory.fang : next.inventory.silk, 1);
  }
});

test("saves antigos, materiais inválidos e pilhas cheias preservam integridade", () => {
  const old = new OfflineSimulation(SEED, {
    seed: SEED, x: 16, y: 16, hp: 100, kills: 5, defeated: [],
  });
  assert.equal(old.slimeKills, 5);
  const bag = new Inventory({ gel: 9, fang: MAX_STACK, silk: -7, potion: 0 });
  assert.equal(bag.addMaterial("fang"), false);
  assert.equal(bag.addMaterial("silk"), true);
  assert.equal(bag.silk, 1);
  assert.equal(bag.fang, MAX_STACK);
  assert.deepEqual(normalizeDrops([
    {id: "f", item: "fang", x: 2, y: 3},
    {id: "s", item: "silk", x: 5, y: 7},
    {id: "s", item: "silk", x: 6, y: 8},
    {id: "x", item: "unknown", x: 2, y: 3},
  ]), [
    {id: "f", item: "fang", x: 2, y: 3},
    {id: "s", item: "silk", x: 5, y: 7},
  ]);
});
