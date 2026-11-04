import assert from "node:assert/strict";
import test from "node:test";
import { Player } from "../src/actors/Player.ts";
import { Slime } from "../src/actors/Slime.ts";
import { ClassicCombat } from "../src/engine/ClassicCombat.ts";
import {
  ClassicPursuit,
  CLASSIC_FOLLOW_LIMIT,
  findClassicApproach,
  inClassicAttackPosition,
} from "../src/engine/ClassicPursuit.ts";
import { clearPath } from "../src/engine/TapNavigator.ts";
import type { CollisionMap } from "../src/world/collision.ts";

const DT = 1 / 60;
const OPEN: CollisionMap = { canMove: () => true };
const WALL: CollisionMap = { canMove: (x, y) =>
  !(x >= 64 && x <= 106 && y >= -32 && y <= 48) };
const STILL = { x: 0, y: 0 };

function walk(
  player: Player, mob: Slime, collision: CollisionMap, follow: ClassicPursuit,
  frames = 260,
): { walked: boolean; reached: boolean } {
  const monsters = new Map([[mob.id, mob]]);
  let walked = false;
  for (let i = 0; i < frames; i++) {
    const movement = follow.direction(DT, player, mob.id, monsters, collision);
    if (Math.hypot(movement.x, movement.y) > 0.05) walked = true;
    player.update(DT, movement, collision);
    assert.ok(collision.canMove(player.x, player.y), "a perseguição atravessou uma parede");
    if (inClassicAttackPosition(player, mob, collision)) {
      return { walked, reached: true };
    }
  }
  return { walked, reached: false };
}

test("seleção distante gera movimento automático e para dentro do alcance real", () => {
  const hero = new Player();
  hero.x = 16; hero.y = 16;
  const mob = new Slime("remote", 215, 16);
  const chase = new ClassicPursuit();
  const status = walk(hero, mob, OPEN, chase);
  assert.deepEqual(status, { walked: true, reached: true });
  const before = { x: hero.x, y: hero.y };
  const idle = chase.direction(DT, hero, mob.id, new Map([[mob.id, mob]]), OPEN);
  assert.deepEqual(idle, STILL);
  hero.update(DT, idle, OPEN);
  assert.ok(Math.hypot(hero.x - before.x, hero.y - before.y) < 4);
  assert.equal(chase.destination, null);
});

test("perseguição usa A* para contornar parede sem atacar por dentro dela", () => {
  const hero = new Player();
  hero.x = 16; hero.y = 16;
  const mob = new Slime("obstructed", 180, 16);
  assert.equal(clearPath(hero, mob, WALL), false);
  assert.equal(inClassicAttackPosition(hero, mob, WALL), false);
  const result = walk(hero, mob, WALL, new ClassicPursuit(), 400);
  assert.equal(result.reached, true);
  assert.equal(clearPath(hero, mob, WALL), true);
});

test("alvo atrás de muro fechado não autoriza aproximação atravessando colisão", () => {
  const noPassage: CollisionMap = { canMove: (x, y) => x < 70 || x > 105 };
  const hero = new Player();
  hero.x = 16; hero.y = 16;
  const mob = new Slime("isolated", 180, 16);
  const chase = new ClassicPursuit();
  assert.equal(findClassicApproach(hero, mob, noPassage) !== null, true);
  const result = walk(hero, mob, noPassage, chase, 100);
  assert.equal(result.reached, false);
  assert.ok(hero.x < 70);
});

test("alvo móvel provoca recálculo e a troca não reaproveita rota antiga", () => {
  const hero = new Player();
  const one = new Slime("one", 240, 16);
  const other = new Slime("other", 16, 215);
  const mobs = new Map([[one.id, one], [other.id, other]]);
  const chase = new ClassicPursuit();
  chase.direction(DT, hero, one.id, mobs, OPEN);
  assert.ok(chase.destination !== null);
  one.x = 265;
  chase.direction(DT, hero, one.id, mobs, OPEN);
  assert.ok(chase.destination && chase.destination.x > 200);
  const switched = chase.direction(DT, hero, other.id, mobs, OPEN);
  assert.ok(switched.y > 0, "troca de alvo não pode usar rota do slime anterior");
  assert.ok(chase.destination && chase.destination.y > 160);
  chase.suspend();
  assert.equal(chase.destination, null);
  const restart = chase.direction(DT, hero, other.id, mobs, OPEN);
  assert.ok(restart.y > 0);
});

test("cancela seguimento para morte, remoção, destino inválido e limite de distância", () => {
  const hero = new Player();
  const mob = new Slime("target", 230, 16);
  const chase = new ClassicPursuit();
  const mobs = new Map([[mob.id, mob]]);
  chase.direction(DT, hero, mob.id, mobs, OPEN);
  assert.ok(chase.destination);
  assert.deepEqual(chase.direction(DT, hero, null, mobs, OPEN), STILL);
  assert.equal(chase.destination, null);
  chase.direction(DT, hero, mob.id, mobs, OPEN);
  mob.hp = 0;
  assert.deepEqual(chase.direction(DT, hero, mob.id, mobs, OPEN), STILL);
  assert.equal(chase.destination, null);
  mob.hp = 2;
  mob.x = CLASSIC_FOLLOW_LIMIT + 500;
  assert.deepEqual(chase.direction(DT, hero, mob.id, mobs, OPEN), STILL);
  assert.equal(chase.destination, null);
  mob.x = 230;
  chase.direction(DT, hero, mob.id, mobs, OPEN);
  hero.hp = 0;
  assert.deepEqual(chase.direction(DT, hero, mob.id, mobs, OPEN), STILL);
  assert.equal(chase.destination, null);
});

test("perseguição e golpe clássico conservam temporização do alvo único", () => {
  const hero = new Player();
  const mob = new Slime("combat", 220, 16);
  const others = new Slime("bystander", 220, 30);
  const mobs = new Map([[mob.id, mob], [others.id, others]]);
  const fight = new ClassicCombat();
  const follow = new ClassicPursuit();
  assert.equal(fight.select(mob.id, mobs), true);
  let strikes = 0;
  for (let i = 0; i < 240; i++) {
    const movement = follow.direction(DT, hero, fight.targetId, mobs, OPEN);
    hero.update(DT, movement, OPEN);
    if (fight.tick(DT, hero, mobs, OPEN)) {
      assert.ok(inClassicAttackPosition(hero, mob, OPEN));
      strikes++;
      hero.startAttack();
      mob.takeHit(hero.x, hero.y);
      if (mob.hp <= 0) mobs.delete(mob.id);
    }
  }
  assert.equal(strikes, 2, "slime deve morrer apenas depois do segundo ataque");
  assert.equal(mob.hp, 0);
  assert.equal(others.hp, 2);
  assert.equal(follow.direction(DT, hero, fight.targetId, mobs, OPEN).x, 0);
  assert.equal(fight.label(mobs), null);
});
