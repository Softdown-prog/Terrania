import test from "node:test";
import assert from "node:assert/strict";
import { CaveRoom } from "../src/engine/rooms/CaveRoom.ts";
import { caveEntranceInCell } from "../src/world/caves.ts";
import { Slime } from "../src/actors/Slime.ts";
import type { StaffId } from "../src/engine/character/Staves.ts";

/**
 * Relato do dono: o Mago só lançava a magia de frente, o que atrapalhava fugir do monstro e atacar ao mesmo tempo. Na superfície o golpe em andamento já
 * segue virado para o alvo; a caverna não seguia, e a magia ainda exigia o alvo à frente do herói. Aqui o herói corre PARA LONGE do alvo e ataca.
 */
const SEED = 842136, STAFF: StaffId = "apprentice";
function room(): { cave: CaveRoom; mob: Slime } {
  const cave = new CaveRoom(caveEntranceInCell(0, 0, SEED)!, 100, 100, new Set());
  const mob = cave.monsters.get("cave:" + SEED + ":0:0:floor:1:slime:5")!;
  cave.monsters.clear(); cave.monsters.set(mob.id, mob);
  mob.hp = mob.maxHp = 400; // aguenta a fuga inteira, sem cair
  let spot: { x: number; y: number } | null = null;
  for (let a = 0; a < 32 && !spot; a++) { // o herói fica a 100 px do slime, com 200 px livres atrás dele
    const dx = Math.cos(a * Math.PI / 16), dy = Math.sin(a * Math.PI / 16);
    let clear = true;
    for (let d = 0; d <= 260 && clear; d += 4) clear = cave.collision.canMove(mob.x + dx * d, mob.y + dy * d);
    if (clear) spot = { x: mob.x + dx * 100, y: mob.y + dy * 100 };
  }
  assert.ok(spot, "há uma reta livre"); cave.player.x = spot.x; cave.player.y = spot.y;
  return { cave, mob };
}
const away = (cave: CaveRoom, mob: Slime) => { const dx = cave.player.x - mob.x, dy = cave.player.y - mob.y, d = Math.hypot(dx, dy); return { x: dx / d, y: dy / d }; };
const caster = (spent: number[]) => ({ staff: STAFF, spend: (cost: number) => { spent.push(cost); return true; } });

test("o Mago corre para longe do alvo e a magia sai e fere do mesmo jeito", () => {
  const { cave, mob } = room(), spent: number[] = [], before = mob.hp, run = away(cave, mob);
  mob.speed = 0; // o alvo fica parado: só a fuga do herói importa
  for (let i = 0; i < 60; i++) cave.update(1 / 60, run, i === 0, "starter", 0, mob.id, caster(spent));
  assert.ok(spent.length >= 1, "a magia foi lançada");
  assert.ok(mob.hp < before, "e feriu o alvo, mesmo com o herói correndo de costas");
  assert.ok(Math.hypot(cave.player.x - mob.x, cave.player.y - mob.y) > 100, "enquanto ele fugia");
});

test("durante o golpe o herói fica virado para o alvo, mesmo andando para o outro lado (e volta a olhar para onde anda depois)", () => {
  const { cave, mob } = room(), run = away(cave, mob); mob.speed = 0;
  const decoy = new Slime("decoy", cave.player.x + run.y * 60, cave.player.y - run.x * 60); decoy.speed = 0; cave.monsters.clear(); cave.monsters.set(decoy.id, decoy); cave.monsters.set(mob.id, mob); // outro monstro, de lado e na frente da fila
  cave.update(1 / 60, run, true, "starter", 0, mob.id, caster([]));
  for (let i = 0; i < 4; i++) cave.update(1 / 60, run, false, "starter", 0, mob.id, caster([]));
  assert.ok(cave.player.attackTime > 0, "o golpe ainda está em andamento");
  const toward = { x: -run.x, y: -run.y };
  assert.ok(cave.player.faceX * toward.x + cave.player.faceY * toward.y > .99, "virado para o alvo, não para onde corre");
  for (let i = 0; i < 40; i++) cave.update(1 / 60, run, false, "starter", 0, mob.id, caster([]));
  assert.equal(cave.player.attackTime, 0);
  assert.ok(cave.player.faceX * run.x + cave.player.faceY * run.y > .5, "acabado o golpe, volta a olhar para onde anda");
});

test("sem alvo escolhido o herói não vira para ninguém", () => {
  const { cave, mob } = room(), run = away(cave, mob); mob.speed = 0;
  cave.update(1 / 60, run, true, "starter", 0, undefined, caster([]));
  for (let i = 0; i < 3; i++) cave.update(1 / 60, run, false, "starter", 0, null, caster([]));
  assert.ok(cave.player.faceX * run.x + cave.player.faceY * run.y > .5, "continua olhando para onde corre");
});
