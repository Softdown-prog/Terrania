import assert from "node:assert/strict";
import test from "node:test";
import { Player } from "../src/actors/Player.ts";
import { Slime } from "../src/actors/Slime.ts";
import { ClassicPursuit, inClassicAttackPosition } from "../src/engine/ClassicPursuit.ts";
import { ClassicCombat, CLASSIC_ATTACK_INTERVAL } from "../src/engine/ClassicCombat.ts";
import { canStrike } from "../src/engine/combat.ts";
import { ClassicTileWalker } from "../src/engine/ClassicTileWalker.ts";
import { TapNavigator } from "../src/engine/TapNavigator.ts";
import type { CollisionMap } from "../src/world/collision.ts";

const OPEN: CollisionMap = { canMove: () => true };
const DT = 1 / 60;
const EAST = { x: 1, y: 0 };
const DIAGONAL = { x: 1, y: 1 };
const STILL = { x: 0, y: 0 };

function frames(walker: ClassicTileWalker, hero: Player, dir: { x: number; y: number },
  world: CollisionMap, count: number): void {
  for (let i = 0; i < count; i++) walker.advance(DT, dir, hero, world);
}

test("CLASSIC-004: direção fixa produz um passo de 32px, com animação e parada no centro", () => {
  const hero = new Player();
  const walker = new ClassicTileWalker();
  walker.advance(DT, EAST, hero, OPEN);
  assert.ok(hero.x > 16 && hero.x < 48, "não pode teleportar o jogador");
  frames(walker, hero, STILL, OPEN, 23);
  assert.equal(hero.x, 48);
  assert.equal(hero.y, 16);
  assert.deepEqual(walker.destination, null);
  const x = hero.x;
  frames(walker, hero, STILL, OPEN, 25);
  assert.equal(hero.x, x, "soltar o controle conclui apenas o passo iniciado");
  assert.equal(hero.faceX, 1);
  assert.equal(hero.faceY, 0);
  assert.ok(hero.walkTime > 0);
});

test("diagonal 32x32 percorre uma distância maior sem atravessar cantos", () => {
  const hero = new Player();
  const walker = new ClassicTileWalker();
  frames(walker, hero, DIAGONAL, OPEN, 21);
  frames(walker, hero, STILL, OPEN, 1);
  // Primeiro passo diagonal tem 32*sqrt(2) de distância e leva ~0,36s.
  assert.equal(hero.x, 48);
  assert.equal(hero.y, 48);
  const fenced: CollisionMap = { canMove: (x, y) => !(x > 20 && y > 20) };
  const another = new Player();
  walker.reset();
  frames(walker, another, DIAGONAL, fenced, 25);
  assert.equal(another.x, 16);
  assert.equal(another.y, 16);
});

test("tile bloqueado e trajetória com obstáculo recusam atravessar paredes", () => {
  const hero = new Player();
  const walker = new ClassicTileWalker();
  const wall: CollisionMap = { canMove: (x) => x < 32 };
  frames(walker, hero, EAST, wall, 50);
  assert.equal(hero.x, 16);
  assert.equal(hero.y, 16);
  assert.equal(walker.destination, null);
});

test("primeiro passo alinha um save antigo fora do centro sem teleporte", () => {
  const hero = new Player();
  hero.x = 25; hero.y = 12;
  const walker = new ClassicTileWalker();
  walker.advance(DT, EAST, hero, OPEN);
  assert.ok(hero.x > 25 && hero.x < 48);
  frames(walker, hero, STILL, OPEN, 26);
  assert.deepEqual({ x: hero.x, y: hero.y }, { x: 48, y: 16 });
});

test("modo de passos não congela recarga de ataque, dano ou invulnerabilidade", () => {
  const hero = new Player();
  const walker = new ClassicTileWalker();
  assert.equal(hero.startAttack(), true);
  assert.equal(hero.startAttack(), false);
  frames(walker, hero, STILL, OPEN, 75);
  assert.equal(hero.attackCooldown, 0);
  assert.equal(hero.attackTime, 0);
  assert.equal(hero.startAttack(), true);
  assert.equal(hero.takeDamage(9, 48, 16), true);
  assert.equal(hero.takeDamage(9, 48, 16), false);
  frames(walker, hero, STILL, OPEN, 60);
  assert.equal(hero.takeDamage(9, 48, 16), true);
  assert.equal(hero.hp, 82);
});

test("perseguição clássica também usa passos de tiles até alcance real", () => {
  const hero = new Player();
  const mob = new Slime("target", 215, 16);
  const mobs = new Map([[mob.id, mob]]);
  const follow = new ClassicPursuit();
  const walker = new ClassicTileWalker();
  let steps = 0;
  for (let i = 0; i < 320; i++) {
    const dir = follow.direction(DT, hero, mob.id, mobs, OPEN, true);
    const oldX = hero.x;
    walker.advance(DT, dir, hero, OPEN);
    if (Math.abs(hero.x - oldX) > 0.1) steps++;
    // Finish the committed tile before asserting grid alignment.
    if (inClassicAttackPosition(hero, mob, OPEN) && walker.destination === null) break;
  }
  assert.ok(steps > 0);
  assert.equal(inClassicAttackPosition(hero, mob, OPEN), true);
  assert.equal(Math.abs((hero.x - 16) % 32), 0);
});

test("o movimento contínuo original continua sendo o padrão sem controlador", () => {
  const hero = new Player();
  hero.update(DT, EAST, OPEN);
  assert.ok(hero.x > 16 && hero.x < 48);
  assert.ok(hero.x < 18, "inércia normal preservada fora do experimento");
});

test("entradas inválidas não geram NaN nem deslocamentos fantasma", () => {
  const hero = new Player();
  const walker = new ClassicTileWalker();
  for (const dir of [{ x: NaN, y: 1 }, { x: Infinity, y: 0 }, STILL])
    frames(walker, hero, dir, OPEN, 2);
  walker.advance(NaN, EAST, hero, OPEN);
  assert.equal(hero.x, 16);
  assert.equal(hero.y, 16);
});

test("perseguição em passos alcança alvos fora da malha sem parar antes da espada", () => {
  const failures: { target: { x: number; y: number }; stopped: { x: number; y: number } }[] = [];
  // Off-grid targets reproduce the continuous-ring/32px arrival mismatch.
  for (let x = 110; x <= 270; x += 20) for (let y = -150; y <= 190; y += 20) {
    const hero = new Player(), mob = new Slime("target", x, y);
    const mobs = new Map([[mob.id, mob]]);
    const follow = new ClassicPursuit(), walker = new ClassicTileWalker();
    let reached = false;
    for (let frame = 0; frame < 450; frame++) {
      walker.advance(DT, follow.direction(DT, hero, mob.id, mobs, OPEN, true), hero, OPEN);
      if (walker.destination === null && inClassicAttackPosition(hero, mob, OPEN)) {
        reached = true;
        assert.equal((hero.x - 16) % 32, 0);
        assert.equal(Math.abs((hero.y - 16) % 32), 0);
        break;
      }
    }
    if (!reached) failures.push({ target: { x, y }, stopped: { x: hero.x, y: hero.y } });
  }
  assert.deepEqual(failures, [], "each reachable target must end in actual attack range");
});

test("perseguir em passos preserva ataque único, intervalo e cancelamento do alvo morto", () => {
  const hero = new Player(), mob = new Slime("off-grid", 110, 130);
  const bystander = new Slime("bystander", 111, 130);
  const mobs = new Map([[mob.id, mob], [bystander.id, bystander]]);
  const follow = new ClassicPursuit(), walker = new ClassicTileWalker();
  const fight = new ClassicCombat();
  fight.select(mob.id, mobs);
  const hits: number[] = [];
  for (let frame = 0; frame < 600; frame++) {
    const movement = follow.direction(DT, hero, fight.targetId, mobs, OPEN, true);
    const attack = fight.tick(DT, hero, mobs, OPEN);
    walker.advance(DT, movement, hero, OPEN);
    if (attack) hero.startAttack();
    if (hero.consumeStrike() && canStrike(hero, mob, OPEN)) {
      hits.push(frame);mob.hp--;
      if (mob.hp === 0) mobs.delete(mob.id);
    }
  }
  assert.equal(mob.hp, 0);
  assert.equal(bystander.hp, 2);
  assert.equal(hits.length, 2);
  assert.ok((hits[1]! - hits[0]!) * DT >= CLASSIC_ATTACK_INTERVAL - DT);
  assert.deepEqual(follow.direction(DT, hero, fight.targetId, mobs, OPEN, true), STILL);
  assert.equal(fight.label(mobs), null);
});


test("passos mantêm 126 px/s a 20, 30, 60 e 144 Hz sem pausa em cada centro", () => {
  for (const hz of [20, 30, 60, 144]) for (const dir of [EAST, DIAGONAL, { x: -1, y: -1 }]) {
    const hero = new Player(), walker = new ClassicTileWalker();
    for (let tick = 0; tick < hz * 2; tick++) {
      walker.advance(1 / hz, dir, hero, OPEN);
      assert.ok(Math.hypot(hero.vx, hero.vy) > 125.99, `pausa a ${hz} Hz`);
    }
    assert.ok(Math.abs(Math.hypot(hero.x - 16, hero.y - 16) - 252) < 1e-7);
    assert.ok(Math.abs(hero.walkTime - 252 * 0.12) < 1e-7);
  }
});

test("lentidão do golpe e terreno conservam a distância entre frequências", () => {
  for (const hz of [20, 30, 60, 144]) {
    const hero = new Player(), walker = new ClassicTileWalker();
    hero.startAttack();
    for (let tick = 0; tick < hz; tick++)
      walker.advance(1 / hz, EAST, hero, { ...OPEN, speedAt: () => 0.82 });
    const expected = 126 * 0.82 * (0.28 * 0.72 + 0.72);
    assert.ok(Math.abs(hero.x - 16 - expected) < 1e-7, `distância incorreta a ${hz} Hz`);
  }
});

test("um tick cruza o centro, vira pela rota e para exatamente no destino", () => {
  const hero = new Player(), walker = new ClassicTileWalker(), nav = new TapNavigator();
  // Two cardinal legs; the inside corner blocks a diagonal shortcut.
  const corridor: CollisionMap = { canMove: (x, y) => Math.abs(y - 16) < 0.01 || Math.abs(x - 48) < 0.01 };
  assert.equal(nav.go(hero, { x: 48, y: 48 }, corridor, true), true);
  for (let i = 0; i < 15; i++) {
    walker.advance(0.05, () => nav.direction(hero, 0), hero, corridor);
    assert.ok(corridor.canMove(hero.x, hero.y));
  }
  assert.deepEqual([hero.x, hero.y, hero.vx, hero.vy], [48, 48, 0, 0]);
  assert.equal(nav.target, null);
  walker.advance(0.05, EAST, hero, OPEN);
  assert.ok(Math.abs(hero.x - 54.3) < 1e-7, "tempo parado não fica acumulado");
});

test("soltar e inverter preservam o passo atual; a próxima direção vale no centro", () => {
  const hero = new Player(), walker = new ClassicTileWalker();
  walker.advance(0.1, EAST, hero, OPEN);
  const end = walker.destination;
  walker.advance(0.1, { x: -1, y: 0 }, hero, OPEN);
  assert.deepEqual(walker.destination, end);
  walker.advance(0.1, { x: -1, y: 0 }, hero, OPEN);
  assert.ok(hero.x < 48 && hero.x > 40);
  assert.equal(hero.faceX, -1);
  frames(walker, hero, STILL, OPEN, 30);
  assert.equal(hero.x, 16);
});

test("a direção de caminhada volta ao terminar o ataque no meio do passo", () => {
  const hero = new Player(), walker = new ClassicTileWalker();
  walker.advance(0.05, EAST, hero, OPEN);
  hero.startAttack(); hero.attackTime = 0.03;
  hero.faceX = 0; hero.faceY = -1;
  walker.advance(0.05, STILL, hero, OPEN);
  assert.notEqual(walker.destination, null);
  assert.deepEqual([hero.faceX, hero.faceY], [1, 0]);
});

test("dt inválido preserva o passo e parede alterada interrompe a trajetória", () => {
  const hero = new Player(), walker = new ClassicTileWalker();
  walker.advance(0.05, EAST, hero, OPEN);
  const before = [hero.x, hero.y], end = walker.destination;
  for (const dt of [NaN, Infinity, 0, -1]) walker.advance(dt, EAST, hero, OPEN);
  assert.deepEqual([hero.x, hero.y], before);
  assert.deepEqual(walker.destination, end);
  walker.advance(0.1, EAST, hero, { canMove: x => x < 26 });
  assert.ok(hero.x < 26);
  assert.equal(walker.destination, null);
  assert.deepEqual([hero.vx, hero.vy], [0, 0]);
});
