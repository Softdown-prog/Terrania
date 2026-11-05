import test from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../src/Room.ts';
import { isValidInput, isValidTarget, isValidWalk, validRoom } from '../../src/shared/protocol.ts';
import { canMoveOnSeed } from '../../src/world/collision.ts';

test('protocolo rejeita coordenadas falsas ou movimento fora da velocidade', () => {
  assert.equal(isValidInput({ type: 'input', x: 1, y: 0, attack: false }), true);
  assert.equal(isValidInput({ type: 'input', x: 99, y: 0, attack: false }), false);
  assert.equal(isValidInput({ type: 'input', x: '3', y: 0, attack: false }), false);
  assert.equal(isValidInput({ type: 'input', x: 0, y: 0, attack: 'sim' }), false);
  assert.equal(validRoom('origins'), true);
  assert.equal(validRoom('../../hack'), false);
});
test('sala usa seed estável e não recebe posição nem HP do cliente', () => {
  const room = new Room('origins');
  assert.equal(room.seed, 842136);
  const guest = room.add('a', 'Aventureiro 1');
  room.receiveInput('a', 1, 0, false);
  room.tick(0.05, Date.now());
  assert.ok(guest.actor.x > 16);
  assert.equal(guest.actor.hp, 100);
  assert.ok(room.snapshotFor('a')?.players.some(p => p.id === 'a'));
  assert.equal(room.snapshotFor('outro'), null);
});
test('o servidor limita destinos de caminhada e preserva a autoridade de posição', () => {
  assert.equal(isValidWalk({ type: 'walk', target: null }), true);
  assert.equal(isValidWalk({ type: 'walk', target: { x: 304, y: -48 } }), true);
  assert.equal(isValidWalk({ type: 'walk', target: { x: 1e12, y: 0 } }), false);
  assert.equal(isValidWalk({ type: 'walk', target: { x: 0, y: NaN } }), false);
  assert.equal(isValidWalk({ type: 'walk' }), false);

  const room = new Room('origins');
  const guest = room.add('a', 'Aventureiro', true);
  Object.assign(guest.actor, { x: 240, y: -144 });
  let now = guest.lastInputAt;
  room.receiveWalk('a', { x: 900, y: -48 });
  room.tick(0.05, now += 50);
  assert.equal(room.snapshotFor('a')?.walkTarget, null);
  assert.equal(guest.actor.x, 240);
  // Several requests within the limit collapse to the latest target.
  room.receiveWalk('a', { x: 368, y: -48 });
  room.receiveWalk('a', { x: 301, y: -49 });
  for (let frame = 0; frame < 45; frame++) {
    room.tick(0.05, now += 50);
    assert.ok(room.world.canMove(guest.actor.x, guest.actor.y));
  }
  assert.deepEqual([guest.actor.x, guest.actor.y], [304, -48]);
  assert.equal(room.snapshotFor('a')?.walkTarget, null);
});

test('soltar a direção ou cancelar o caminho termina somente o passo comprometido', () => {
  const room = new Room('origins');
  const guest = room.add('a', 'Aventureiro', true);
  let now = guest.lastInputAt;
  room.receiveWalk('a', { x: 112, y: 16 });
  room.tick(0.05, now += 50);
  assert.ok(guest.actor.x > 16 && guest.actor.x < 48);
  room.receiveWalk('a', null);
  for (let frame = 0; frame < 16; frame++) room.tick(0.05, now += 50);
  assert.deepEqual([guest.actor.x, guest.actor.y], [48, 16]);

  room.receiveInput('a', 1, 0, false);
  now = guest.lastInputAt;
  room.tick(0.05, now + 50);
  assert.ok(guest.actor.x > 48 && guest.actor.x < 80);
  room.receiveInput('a', 0, 0, false);
  for (let frame = 0; frame < 16; frame++) room.tick(0.05, now += 50);
  assert.deepEqual([guest.actor.x, guest.actor.y], [80, 16]);
});
test('movimento em terreno sólido é determinado pela seed do servidor', () => {
  assert.equal(canMoveOnSeed(16, 16, 842136), true);
  assert.equal(canMoveOnSeed(Number.NaN, 16, 842136), false);
  assert.equal(canMoveOnSeed(1e12, 0, 842136), false);
});

test('troca de alvo durante o preparo invalida o golpe na sala autoritativa', () => {
  assert.equal(isValidTarget({ type: 'target', id: '-8,-8,0' }), true);
  assert.equal(isValidTarget({ type: 'target', id: null }), true);
  assert.equal(isValidTarget({ type: 'target', id: 'x'.repeat(65) }), false);
  const room = new Room('origins');
  const guest = room.add('a', 'Aventureiro', true, true);
  Object.assign(guest.actor, { x: -3984, y: -4016 });
  let now = guest.lastInputAt;
  for (let frame = 0; frame < 32; frame++) room.tick(0.05, now += 50);
  const first = '-8,-8,0', second = '-8,-8,1';
  const hp = (id: string) => room.snapshotFor('a')?.mobs.find(mob => mob.id === id)?.hp;
  assert.deepEqual([hp(first), hp(second)], [2, 2]);
  room.receiveTarget('a', 'criatura-inexistente');
  assert.equal(room.snapshotFor('a')?.focus, null);
  room.receiveTarget('a', first);
  room.tick(0.05, now += 50);
  assert.ok(guest.actor.attackTime > 0);
  room.receiveTarget('a', second);
  for (let frame = 0; frame < 4; frame++) room.tick(0.05, now += 50);
  assert.deepEqual([hp(first), hp(second)], [2, 2]);
  assert.equal(room.snapshotFor('a')?.focus?.id, second);
  room.receiveTarget('a', null);
  assert.equal(room.snapshotFor('a')?.focus, null);
});

test('abate online dá XP apenas ao autor e o respawn conserva o nível', () => {
  const room = new Room('origins');
  const guest = room.add('a', 'Aventureiro', true, true, true);
  const other = room.add('b', 'Observador', true, true, true);
  Object.assign(guest.actor, { x: 48, y: -272 });
  guest.experience = 20;
  let now = guest.lastInputAt;
  for (let frame = 0; frame < 32; frame++) room.tick(0.05, now += 50);
  room.receiveTarget('a', '0,-1,0');
  for (let frame = 0; frame < 120 && guest.kills === 0; frame++) room.tick(0.05, now += 50);
  assert.equal(guest.kills, 1);
  assert.equal(guest.experience, 30);
  assert.equal(guest.actor.maxHp, 110);
  assert.equal(other.experience, 0);
  assert.equal(room.snapshotFor('a')?.players.find(hero => hero.id === 'a')?.experience, 30);
  guest.actor.hp = 0;
  room.tick(0.05, now += 50);
  assert.equal(guest.actor.hp, 110);
  assert.equal(guest.experience, 30);
});

test('snapshot conserva o formato v3 e a vida do Slime com catálogo local', () => {
  const room = new Room('origins');
  const guest = room.add('a', 'Aventureiro 1');
  guest.actor.x = -660;
  guest.actor.y = -1008;
  const start = guest.lastInputAt;
  for (let frame = 0; frame < 32; frame++) room.tick(0.05, start + frame * 50);
  const slime = room.snapshotFor('a')?.mobs.find(mob => mob.id === '-2,-2,0');
  assert.ok(slime, 'slime gerado naturalmente na seed 842136');
  assert.equal(slime.hp, 2);
  assert.deepEqual(Object.keys(slime).sort(), ['bounce', 'hp', 'hurtTime', 'id', 'x', 'y']);
});
