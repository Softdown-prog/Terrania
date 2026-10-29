import test from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../src/Room.ts';
import { isValidInput, validRoom } from '../../src/shared/protocol.ts';
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
test('movimento em terreno sólido é determinado pela seed do servidor', () => {
  assert.equal(canMoveOnSeed(16, 16, 842136), true);
  assert.equal(canMoveOnSeed(Number.NaN, 16, 842136), false);
  assert.equal(canMoveOnSeed(1e12, 0, 842136), false);
});
