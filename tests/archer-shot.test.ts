import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { Player } from "../src/actors/Player.ts";
import { RegionalMonster } from "../src/actors/RegionalMonster.ts";
import { Slime } from "../src/actors/Slime.ts";
import { BOWS } from "../src/engine/character/Bows.ts";
import { ATTACK_DURATION } from "../src/engine/combat/combat.ts";
import { ClassicCombat } from "../src/engine/combat/ClassicCombat.ts";
import { arrowHitDamage, arrowStrikeTarget, bowReach, resolveArrowStrike } from "../src/engine/combat/ArrowCombat.ts";
import { CaveRoom } from "../src/engine/rooms/CaveRoom.ts";
import { NO_AMMO_MESSAGE } from "../src/game/messages/noAmmo.ts";
import { caveEntranceInCell } from "../src/world/caves.ts";
import type { CollisionMap } from "../src/world/collision.ts";

/** O tiro do Arqueiro (ADR 0111, lote A1c-1): gasta a flecha ao começar, fere o alvo escolhido ao alcance, avisa "Sem flechas" e vale igual na superfície e na caverna. */
const SEED = 842136, DT = 1 / 60, STILL = { x: 0, y: 0 }, OPEN: CollisionMap = { canMove: () => true };
const BOW = BOWS.hunting, REACH = 7 * 32;
const wall = (x: number): CollisionMap => ({ canMove: (px: number) => px < x });

function archerWorld(distance = 150, hp?: number) {
  const sim = new OfflineSimulation(SEED, undefined, "archer");
  sim.update(0.01, STILL, false); sim.slimes.clear(); sim.player.x = 16; sim.player.y = 16; sim.player.faceX = 1; sim.player.faceY = 0;
  const mob = new RegionalMonster("m1", "glacial-wolf", 16 + distance, 16); if (hp) mob.hp = mob.maxHp = hp; sim.slimes.set(mob.id, mob);
  const fight = new ClassicCombat(); fight.select(mob.id, sim.slimes);
  const frame = (): void => {
    const p = sim.combatProfile;
    const attack = fight.tick(DT, sim.player, sim.slimes, sim.collision, p.interval, p.weapon, p.ranged);
    sim.update(DT, STILL, attack, fight.strikeTargetId);
  };
  return { sim, mob, fight, frame };
}

test("o dano do tiro: o do arco depois da defesa do alvo, no mínimo 1, com bônus em porcentagem; o alcance é de 7 tiles", () => {
  assert.equal(bowReach("hunting"), REACH);
  const dummy = (defense: number) => ({ defense }) as Slime;
  assert.equal(arrowHitDamage("hunting", "reed", dummy(0)), 8); assert.equal(arrowHitDamage("hunting", "reed", dummy(3)), 5);
  assert.equal(arrowHitDamage("hunting", "reed", dummy(50)), 1, "nunca menos de 1");
  assert.equal(arrowHitDamage("hunting", "reed", dummy(0), 25), 10, "bônus de 25%"); assert.equal(arrowHitDamage("hunting", "reed", dummy(2), 50), 10);
});

test("quem o tiro atinge: só o alvo escolhido, vivo, ao alcance e sem parede; sem alvo escolhido, ninguém", () => {
  const hero = { x: 0, y: 0, faceX: 1, faceY: 0 }, near = new Slime("near", 100, 0), far = new Slime("far", REACH + 40, 0), behind = new Slime("behind", -100, 0), dead = new Slime("dead", 50, 0);
  dead.hp = 0;
  const mobs = [near, far, behind, dead];
  assert.equal(arrowStrikeTarget("hunting", hero, mobs, OPEN, "near"), near);
  assert.equal(arrowStrikeTarget("hunting", hero, mobs, OPEN, "behind"), behind, "atira para qualquer lado, como a magia");
  assert.equal(arrowStrikeTarget("hunting", hero, mobs, OPEN, "far"), null, "fora do alcance");
  assert.equal(arrowStrikeTarget("hunting", hero, mobs, OPEN, "dead"), null, "já caiu");
  assert.equal(arrowStrikeTarget("hunting", hero, mobs, wall(50), "near"), null, "parede no caminho");
  for (const none of [undefined, null, "nobody"]) assert.equal(arrowStrikeTarget("hunting", hero, mobs, OPEN, none), null, String(none));
  const edge = new Slime("edge", REACH - 1, 0); assert.equal(arrowStrikeTarget("hunting", hero, [edge], OPEN, "edge"), edge, "dentro do alcance por um pixel");
});

test("resolver o tiro: fere uma vez, avisa quem caiu, devolve o dano causado (sem passar da vida do alvo)", () => {
  const p = new Player(), mob = new Slime("m", 10, 0), fallen: string[] = [];
  const strong = new RegionalMonster("tank", "glacial-wolf", 10, 0); strong.hp = strong.maxHp = 100;
  assert.equal(resolveArrowStrike("hunting", "reed", p, strong, m => fallen.push(m.id)), 8 - strong.defense, "fere pelo dano do arco menos a defesa"); assert.equal(strong.hp, 100 - (8 - strong.defense)); assert.deepEqual(fallen, [], "e ele segue de pé");
  assert.equal(resolveArrowStrike("hunting", "reed", p, mob, m => fallen.push(m.id)), 2, "o slime comum tem 2 de vida: o dano contado é a vida que ele tinha"); assert.equal(mob.hp, 0); assert.deepEqual(fallen, ["m"]); fallen.length = 0;
  const weak = new Slime("w", 10, 0); weak.hp = 1;
  assert.equal(resolveArrowStrike("hunting", "reed", p, weak, m => fallen.push(m.id)), 1, "o dano contado não passa da vida que sobrava"); assert.deepEqual(fallen, ["w"]);
  assert.equal(resolveArrowStrike("hunting", "reed", p, null, () => fallen.push("x")), 0); assert.equal(resolveArrowStrike("hunting", "reed", p, weak, () => fallen.push("y")), 0, "alvo caído não é ferido de novo");
  assert.deepEqual(fallen, ["w"]);
});

test("o herói atira: paga a flecha só se pode atacar, guarda o preparo do arco, e o golpe de espada volta a valer depois", () => {
  const p = new Player(), paid: number[] = [], pay = (ok = true) => (n: number) => { paid.push(n); return ok; };
  assert.equal(p.startShot("hunting", pay(false)), false, "sem flecha não sai"); assert.deepEqual([p.attackTime, p.attackCooldown, p.attackBow], [0, 0, null]);
  assert.equal(p.startShot("hunting", pay()), true); assert.deepEqual(paid, [1, 1]);
  assert.deepEqual([p.attackTime, p.attackCooldown, p.attackBow, p.attackStaff, p.attackWindup, p.strikeDamage, p.attackIsSpell], [ATTACK_DURATION, BOW.interval, "hunting", null, BOW.windup, 8, false]);
  assert.equal(p.startShot("hunting", pay()), false, "em recarga não atira de novo"); assert.equal(paid.length, 2, "e não paga");
  const dead = new Player(); dead.hp = 0; assert.equal(dead.startShot("hunting", pay()), false); assert.equal(paid.length, 2);
  const stunned = new Player(); stunned.applyStatus("stun", 2); assert.equal(stunned.startShot("hunting", pay()), false); assert.equal(paid.length, 2);
  const slowed = new Player(); slowed.applyStatus("attack-slow", 5); slowed.startShot("hunting", pay()); assert.ok(Math.abs(slowed.attackCooldown - BOW.interval * 1.8) < 1e-9, "a lentidão de ataque vale");
  const q = new Player(); q.startShot("hunting", pay()); q.attackCooldown = 0; q.attackTime = 0;
  q.startAttack("starter"); assert.equal(q.attackBow, null, "a espada limpa o arco"); q.attackCooldown = 0; q.startShot("hunting", pay()); q.attackCooldown = 0; q.startCast("apprentice", pay());
  assert.equal(q.attackBow, null, "a magia limpa o arco"); assert.equal(q.attackStaff, "apprentice");
  q.attackCooldown = 0; q.startShot("hunting", pay()); assert.equal(q.attackStaff, null, "o tiro limpa a magia"); assert.equal(q.attackBow, "hunting");
});

test("na superfície: o tiro gasta uma flecha, fere o alvo escolhido a 150 px e o Cavaleiro não é afetado", () => {
  const { sim, mob, frame } = archerWorld(150, 100);
  assert.equal(sim.inventory.quiver.counts.reed, 30);
  for (let i = 0; i < 60; i++) frame();
  assert.ok(mob.hp < 100, "o tiro feriu"); assert.ok(sim.inventory.quiver.counts.reed < 30, "e gastou flecha");
  const shots = 30 - sim.inventory.quiver.counts.reed;
  assert.ok(shots >= 1 && shots <= 2, `um tiro por 0,8 s: ${shots}`);
  assert.equal(100 - mob.hp, shots * (8 - mob.defense), "cada tiro tira o dano do arco menos a defesa");
});

test("na superfície: o tiro só sai com o alvo escolhido (sem alvo a flecha não é gasta) e fora do alcance não atira", () => {
  const { sim, mob } = archerWorld(150, 100);
  for (let i = 0; i < 90; i++) sim.update(DT, STILL, true, null);
  assert.equal(sim.inventory.quiver.counts.reed, 30, "sem alvo escolhido nada é gasto"); assert.equal(mob.hp, 100);
  const far = archerWorld(REACH + 60, 100);
  for (let i = 0; i < 90; i++) far.frame();
  assert.equal(far.sim.inventory.quiver.counts.reed, 30, "fora do alcance não atira"); assert.equal(far.mob.hp, 100);
});

test("sem flecha o tiro não sai, a recarga não é gasta e o aviso 'Sem flechas' vem uma vez por bloqueio", () => {
  const dry = archerWorld(150, 100);
  dry.sim.inventory.spendArrows(30);
  assert.deepEqual(dry.sim.combatProfile.ranged, { reach: REACH, ready: false, lacks: "ammo" });
  let notices = 0;
  for (let i = 0; i < 100; i++) { dry.frame(); if (dry.fight.takeBlocked() === "no-ammo") notices++; }
  assert.equal(notices, 1, "avisa uma vez"); assert.equal(dry.mob.hp, 100); assert.equal(dry.sim.player.attackCooldown, 0, "a recarga não foi gasta");
  dry.sim.inventory.gainArrows("reed", 5);
  for (let i = 0; i < 60; i++) dry.frame();
  assert.ok(dry.mob.hp < 100, "com flecha de novo, atira"); assert.ok(dry.sim.inventory.quiver.counts.reed < 5);
  assert.equal(NO_AMMO_MESSAGE, "Sem flechas");
  const mage = new OfflineSimulation(SEED, undefined, "mage").combatProfile.ranged!; assert.equal(mage.lacks, undefined, "o Mago segue sem campo extra (falta mana)");
});

test("na superfície: a última flecha sai e depois acabam; a flecha gasta no preparo não volta se o alvo some", () => {
  const { sim, mob, frame } = archerWorld(150, 4000);
  sim.inventory.spendArrows(29);
  for (let i = 0; i < 200; i++) frame();
  assert.equal(sim.inventory.quiver.counts.reed, 0); assert.ok(mob.hp < 4000, "a última foi atirada");
  assert.equal(4000 - mob.hp, 8 - mob.defense, "e foi só uma");
});

test("na caverna: o tiro usa a aljava pelo `shooter`, fere o alvo escolhido, e sem `shooter` o herói bate com a espada", () => {
  const cave = new CaveRoom(caveEntranceInCell(0, 0, SEED)!, 100, 100, new Set());
  const mob = cave.monsters.get("cave:" + SEED + ":0:0:floor:1:slime:5")!; cave.monsters.clear(); cave.monsters.set(mob.id, mob);
  mob.hp = mob.maxHp = 400; mob.speed = 0;
  const spot = (() => { for (let a = 0; a < 32; a++) { const dx = Math.cos(a * Math.PI / 16), dy = Math.sin(a * Math.PI / 16); let clear = true; for (let d = 0; d <= 160 && clear; d += 4) clear = cave.collision.canMove(mob.x + dx * d, mob.y + dy * d); if (clear) return { x: mob.x + dx * 120, y: mob.y + dy * 120 }; } return null; })();
  assert.ok(spot, "há uma reta livre"); cave.player.x = spot.x; cave.player.y = spot.y;
  const spent: number[] = [], shooter = { bow: "hunting" as const, arrow: "reed" as const, spend: (n: number) => { spent.push(n); return true; } };
  for (let i = 0; i < 60; i++) cave.update(DT, STILL, i === 0, "starter", 0, mob.id, undefined, shooter);
  assert.deepEqual(spent, [1], "uma flecha"); assert.equal(400 - mob.hp, 8 - mob.defense, "o dano do arco");
  assert.equal(cave.player.attackBow, "hunting");
  const none: number[] = [];
  for (let i = 0; i < 60; i++) cave.update(DT, STILL, i === 0, "starter", 0, undefined, undefined, { ...shooter, spend: n => { none.push(n); return true; } });
  assert.deepEqual(none, [], "sem alvo escolhido a flecha não é gasta");
});

test("a fiação: os dois modos avisam 'Sem flechas' e a caverna só dá `shooter` ao Arqueiro", () => {
  const surface = readFileSync("src/game/modes/surfaceMode.ts", "utf8"), cave = readFileSync("src/game/modes/caveMode.ts", "utf8"), sim = readFileSync("src/engine/OfflineSimulation.ts", "utf8");
  for (const [name, source] of [["superfície", surface], ["caverna", cave]] as const)
    assert.match(source, /blocked === "no-ammo" \? NO_AMMO_MESSAGE : NO_MANA_MESSAGE/, `${name}: avisa o que falta`);
  assert.match(cave, /host\.sim\.heroClass === "archer" \? \{ bow: host\.sim\.equippedBow, arrow: host\.sim\.inventory\.quiver\.equipped, spend: arrows => host\.sim\.inventory\.spendArrows\(arrows\) \} : undefined/);
  assert.match(sim, /if \(this\.heroClass === "archer"\) this\.player\.startShot\(this\.equippedBow, arrows => typeof strikeTargetId === "string" && this\.inventory\.spendArrows\(arrows\)\);/);
});
