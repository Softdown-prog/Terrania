import assert from "node:assert/strict";
import test from "node:test";
import { Player } from "../src/actors/Player.ts";
import { ATTACK_DURATION, ATTACK_WINDUP } from "../src/engine/combat.ts";
import { swordSwing } from "../src/render/heroPose.ts";
import { gait, blink, slimePose, smoothTo, resetSmoothing } from "../src/render/animation.ts";
import { attackBody, swingTrail } from "../src/render/heroPose.ts";
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

test("a espada de ferro cruza o alvo somente após seu preparo próprio", () => {
  const hero = new Player();
  const still = { x: 0, y: 0 }, open = { canMove: () => true };
  hero.startAttack("forge");
  hero.update(WEAPONS.forge.windup / 2, still, open);
  assert.equal(hero.consumeStrike(), false);
  assert.ok(swordSwing(hero.attackTime, hero.attackWeapon).angle < 0);
  hero.update(WEAPONS.forge.windup / 2, still, open);
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

test("caminhada procedural suaviza parada sem mover pés enquanto imóvel", () => {
  const standing = gait(1.7, 0);
  assert.equal(standing.a.along, 0);
  assert.equal(standing.a.lift, 0);
  assert.ok(standing.b.along === 0);
  assert.equal(standing.b.lift, 0);
  assert.ok(standing.bob === 0);
  const walking = gait(Math.PI / 2, 1);
  assert.ok(walking.a.along > 0 && walking.b.along < 0);
  assert.ok(Number.isFinite(walking.bob));
});

test("poses procedurais não produzem valores inválidos quando o impacto oscila", () => {
  for (const bounce of [-10, -1, 0, 1, 10, Number.NaN]) {
    const pose = slimePose(bounce, 0.2, 0.8, 0.5);
    for (const v of Object.values(pose)) assert.ok(Number.isFinite(v));
    assert.ok(pose.scaleX > 0 && pose.scaleY > 0);
  }
  for (const time of [0, 0.1, 1, 10]) {
    const eye = blink(time, 0.31);
    assert.ok(eye >= 0 && eye <= 1);
  }
});

test("suavização das animações independe da taxa de quadros e pode ser reiniciada", () => {
  resetSmoothing();
  assert.equal(smoothTo("test:hero", 0, 0, 10), 0);
  const value = smoothTo("test:hero", 1, 0.1, 10);
  assert.ok(value > 0 && value < 1);
  assert.ok(smoothTo("test:hero", 1, 0.2, 10) > value);
  resetSmoothing();
  assert.equal(smoothTo("test:hero", 0, 0, 10), 0);
  assert.equal(smoothTo("preview", 0.7, undefined, 10), 0.7);
});

test("avanço visual e rastro da lâmina respeitam o momento de impacto", () => {
  for (const weapon of ["starter", "forge"] as const) {
    const windup = WEAPONS[weapon].windup;
    const impactTime = ATTACK_DURATION - windup;
    assert.equal(attackBody(ATTACK_DURATION, weapon).impact, 0);
    assert.ok(Math.abs(attackBody(impactTime, weapon).lunge) < 1e-8);
    assert.ok(swingTrail(impactTime, weapon).angles.length > 0);
    assert.equal(swingTrail(0, weapon).angles.length, 0);
  }
});
