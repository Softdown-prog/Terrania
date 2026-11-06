import assert from "node:assert/strict";
import test from "node:test";
import { Player } from "../src/actors/Player.ts";
import { ATTACK_DURATION, ATTACK_WINDUP } from "../src/engine/combat.ts";
import { swordSwing } from "../src/render/heroPose.ts";
import { WEAPONS } from "../src/engine/Weapons.ts";

test("espada cruza a direção do alvo no instante em que o golpe fica disponível", () => {
  const hero = new Player();
  hero.startAttack();
  assert.ok(swordSwing(hero.attackTime).angle < 0);
  hero.update(ATTACK_WINDUP, { x: 0, y: 0 }, { canMove: () => true });
  assert.equal(hero.consumeStrike(), true);
  assert.ok(Math.abs(swordSwing(hero.attackTime).angle) < 1e-12);
  assert.equal(swordSwing(hero.attackTime).trail, true);
  hero.update(0.1, { x: 0, y: 0 }, { canMove: () => true });
  assert.ok(swordSwing(hero.attackTime).angle > 0);
  assert.equal(hero.consumeStrike(), false);
});

test("a forjada cruza o alvo somente após o preparo de 180 ms", () => {
  const hero = new Player();
  const still = { x: 0, y: 0 }, open = { canMove: () => true };
  hero.startAttack("forge");
  hero.update(0.1, still, open);
  assert.equal(hero.consumeStrike(), false);
  assert.ok(swordSwing(hero.attackTime, hero.attackWeapon).angle < 0);
  hero.update(WEAPONS.forge.windup - 0.1, still, open);
  assert.equal(hero.consumeStrike(), true);
  assert.ok(Math.abs(swordSwing(hero.attackTime, hero.attackWeapon).angle) < 1e-12);
  assert.equal(swordSwing(hero.attackTime, hero.attackWeapon).trail, true);
});

test("preparo e conclusão da espada formam um arco contínuo", () => {
  let previous = -Infinity;
  for (let i = 0; i <= 280; i++) {
    const angle = swordSwing(ATTACK_DURATION - i / 1000).angle;
    assert.ok(Number.isFinite(angle) && angle >= previous);
    if (Number.isFinite(previous)) assert.ok(angle - previous < 0.03);
    previous = angle;
  }
});
