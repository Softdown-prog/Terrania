import test from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../src/Room.ts';
import { isValidInput, isValidInventoryMessage, isValidTarget, isValidWalk, validRoom } from '../../src/shared/protocol.ts';
import { MAX_STACK } from '../../src/engine/Inventory.ts';
import { canMoveOnSeed, clearPath } from '../../src/world/collision.ts';

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

test('a quina protege o jogador do contato com um Slime da sala', () => {
  const room = new Room('origins');
  const guest = room.add('a', 'Aventureiro 1', true, true);
  Object.assign(guest.actor, { x: -8, y: -360 });
  let now = guest.lastInputAt;
  for (let frame = 0; frame < 100; frame++) room.tick(0.05, now += 50);
  const slime = room.snapshotFor('a')?.mobs.find(mob => mob.id === '0,-1,0');
  assert.ok(slime);
  assert.ok(Math.hypot(slime.x - guest.actor.x, slime.y - guest.actor.y) < 24);
  assert.equal(clearPath(slime, guest.actor, room.world), false);
  assert.equal(guest.actor.hp, 100);

  Object.assign(guest.actor, { x: -16, y: -336 });
  room.tick(0.05, now += 50);
  assert.equal(guest.actor.hp, 91);
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

test('ATACAR sem alvo preserva a rota por toque na fila e em andamento', () => {
  const room = new Room('origins');
  const guest = room.add('a', 'Hero', true, true);
  const destination = { x: 144, y: 16 };
  room.receiveWalk('a', destination);
  room.receiveInput('a', 0, 0, true);
  let now = guest.lastInputAt;
  room.tick(0.05, now += 50);
  assert.deepEqual(room.snapshotFor('a')?.walkTarget, destination);

  room.receiveInput('a', 0, 0, true);
  room.tick(0.05, now += 50);
  assert.deepEqual(room.snapshotFor('a')?.walkTarget, destination);
  assert.equal(room.snapshotFor('a')?.focus, null);
  for (let frame = 0; frame < 25; frame++) room.tick(0.05, now += 50);
  assert.deepEqual([guest.actor.x, guest.actor.y], [destination.x, destination.y]);
});

test('ATACAR com uma criatura próxima assume a caminhada e retoma a perseguição', () => {
  const room = new Room('origins');
  const guest = room.add('a', 'Hero', true, true);
  Object.assign(guest.actor, { x: 48, y: -208 });
  let now = guest.lastInputAt;
  for (let frame = 0; frame < 31; frame++) room.tick(0.05, now += 50);

  const walkAway = { x: 48, y: -112 };
  room.receiveWalk('a', walkAway);
  room.tick(0.05, now += 50);
  assert.deepEqual(room.snapshotFor('a')?.walkTarget, walkAway);
  room.receiveInput('a', 0, 0, true);
  assert.equal(room.snapshotFor('a')?.walkTarget, null);
  assert.equal(room.snapshotFor('a')?.focus?.id, '0,-1,0');

  now += 350;
  room.receiveWalk('a', walkAway);
  room.tick(0.05, now += 50);
  assert.deepEqual(room.snapshotFor('a')?.walkTarget, walkAway);
  room.receiveInput('a', 0, 0, true);
  assert.equal(room.snapshotFor('a')?.walkTarget, null);
  assert.equal(room.snapshotFor('a')?.focus?.id, '0,-1,0');
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

test('a sala atinge o Slime sobreposto sem sair do tile', () => {
  const room = new Room('origins');
  const guest = room.add('a', 'Aventureiro', true, true, true);
  Object.assign(guest.actor, { x: -560, y: -1008 });
  let now = guest.lastInputAt;
  for (let frame = 0; frame < 31; frame++) room.tick(0.05, now += 50);
  const id = '-2,-2,0';
  const slime = () => room.snapshotFor('a')?.mobs.find(mob => mob.id === id);
  assert.deepEqual([slime()?.x, slime()?.y, slime()?.hp], [-560, -1008, 2]);

  room.receiveTarget('a', id);
  room.tick(0.05, now += 50);
  assert.ok(guest.actor.attackTime > 0);
  for (let frame = 0; frame < 45 && guest.kills === 0; frame++) {
    room.tick(0.05, now += 50);
    assert.deepEqual([guest.actor.x, guest.actor.y], [-560, -1008]);
  }
  assert.equal(slime(), undefined);
  assert.equal(guest.kills, 1);
  assert.equal(guest.experience, 10);
});

test('o gel do golpe final fica privado e só entra uma vez na bolsa do dono', () => {
  const room = new Room('origins');
  const owner = room.add('a', 'Aventureiro', true, true, true, true);
  const other = room.add('b', 'Outro', true, true, true, true);
  assert.ok(owner.inventory);
  for (let i = 0; i < MAX_STACK; i++) owner.inventory.bag.addGel();
  Object.assign(owner.actor, { x: -560, y: -1008 });
  let now = owner.lastInputAt;
  for (let i = 0; i < 31; i++) room.tick(0.05, now += 50);
  Object.assign(other.actor, { x: -560, y: -1008 });
  room.receiveTarget('a', '-2,-2,0');
  for (let i = 0; i < 45 && owner.kills === 0; i++) room.tick(0.05, now += 50);
  assert.equal(owner.kills, 1);
  const snapshot = () => room.snapshotFor('a')?.inventory;
  const drop = snapshot()?.drops[0];
  assert.ok(drop);
  assert.equal(snapshot()?.gel, MAX_STACK);
  assert.deepEqual(room.snapshotFor('b')?.inventory, { gel: 0, potion: 0, drops: [], receipt: null });
  assert.ok(room.snapshotFor('b')?.players.some(hero => hero.id === 'a' && !('inventory' in hero)));

  Object.assign(owner.actor, { x: 448, y: 250 });
  room.receiveInventory('a', { type: 'inventory', action: 'trade-potion', requestId: 1 });
  assert.equal(snapshot()?.gel, MAX_STACK - 3);
  room.tick(0.05, now += 50);
  assert.equal(room.snapshotFor('b')?.inventory?.gel, 0);
  Object.assign(owner.actor, { x: drop.x, y: drop.y });
  for (let i = 0; i < 3; i++) room.tick(0.05, now += 50);
  assert.equal(snapshot()?.gel, MAX_STACK - 2);
  assert.deepEqual(snapshot()?.drops, []);
  owner.actor.hp = 0;
  room.tick(0.05, now += 50);
  assert.equal(snapshot()?.potion, 1);
  room.remove('a');
  room.add('new', 'Aventureiro', true, true, true, true);
  assert.deepEqual(room.snapshotFor('new')?.inventory, { gel: 0, potion: 0, drops: [], receipt: null });
});

test('a coleta online exige caminho livre até o gel', () => {
  const room = new Room('origins');
  const guest = room.add('a', 'Aventureiro', true, true, true, true);
  Object.assign(guest.actor, { x: -8, y: -360 });
  assert.ok(guest.inventory);
  const drop = { id: 'gel', item: 'gel' as const, x: -6, y: -345 };
  assert.ok(Math.hypot(drop.x - guest.actor.x, drop.y - guest.actor.y) < 24);
  assert.equal(clearPath(guest.actor, drop, room.world), false);
  guest.inventory.drops.set(drop.id, drop);
  room.tick(0.05, guest.lastInputAt);
  assert.equal(guest.inventory.bag.gel, 0);
  Object.assign(guest.actor, { x: -16, y: -336 });
  room.tick(0.05, guest.lastInputAt + 50);
  assert.equal(guest.inventory.bag.gel, 1);
});

test('troca e cura usam posição e HP da sala e ignoram pedidos repetidos', () => {
  const room = new Room('origins');
  const guest = room.add('a', 'Aventureiro', true, true, true, true);
  assert.ok(guest.inventory);
  for (let i = 0; i < 6; i++) guest.inventory.bag.addGel();
  const command = (requestId: number, action: 'trade-potion' | 'use-potion' = 'trade-potion') => ({
    type: 'inventory' as const, action, requestId,
  });
  for (const requestId of [0, -1, 0.5, Infinity, Number.MAX_SAFE_INTEGER + 1, '1'])
    assert.equal(isValidInventoryMessage({ ...command(1), requestId }), false);
  assert.equal(isValidInventoryMessage({ ...command(1), action: 'add-gel' }), false);
  assert.equal(isValidInventoryMessage(command(1)), true);
  const state = () => room.snapshotFor('a')?.inventory;
  room.receiveInventory('a', command(1));
  assert.equal(state()?.receipt?.outcome, 'too-far');
  Object.assign(guest.actor, { x: 448, y: 250 });
  room.receiveInventory('a', command(1));
  assert.equal(state()?.gel, 6);
  room.receiveInventory('a', command(2));
  room.receiveInventory('a', command(2));
  room.receiveInventory('a', command(1));
  assert.deepEqual(state()?.receipt, { requestId: 2, action: 'trade-potion', outcome: 'traded' });
  assert.equal(state()?.gel, 3);
  assert.equal(state()?.potion, 1);
  room.receiveInventory('a', command(3));
  assert.equal(state()?.potion, 2);
  room.receiveInventory('a', command(4, 'use-potion'));
  assert.equal(state()?.receipt?.outcome, 'full-health');
  assert.equal(state()?.potion, 2);
  guest.actor.hp = 15;
  room.receiveInventory('a', command(5, 'use-potion'));
  room.receiveInventory('a', command(5, 'use-potion'));
  assert.equal(state()?.receipt?.outcome, 'healed');
  assert.equal(guest.actor.hp, 50);
  assert.equal(state()?.potion, 1);
  guest.actor.hp = 0;
  room.receiveInventory('a', command(6, 'use-potion'));
  assert.equal(state()?.receipt?.outcome, 'unavailable');
  assert.equal(state()?.potion, 1);
  guest.actor.hp = 90;
  room.receiveInventory('a', command(7, 'use-potion'));
  assert.equal(guest.actor.hp, 100);
  assert.equal(state()?.potion, 0);
  room.receiveInventory('a', command(8));
  assert.equal(state()?.receipt?.outcome, 'insufficient-gel');
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


test('sala preserva um toque curto entre ticks e publica o passo com relógio', () => {
  const room = new Room('origins');
  const guest = room.add('a', 'Hero', true);
  room.receiveInput('a', 1, 0, false);
  room.receiveInput('a', 0, 0, false);
  room.tick(0.05);
  const snapshot = room.snapshotFor('a')!;
  assert.equal(snapshot.time, 0.05);
  assert.deepEqual(snapshot.players[0]?.stepTarget, { x: 48, y: 16 });
  assert.ok(guest.actor.x > 16 && guest.actor.x < 48);
  for (let i = 0; i < 10; i++) room.tick(0.05);
  assert.deepEqual([guest.actor.x, guest.actor.y], [48, 16]);
  assert.equal(room.snapshotFor('a')?.players[0]?.stepTarget, null);
  room.add('legacy', 'Legacy');
  assert.equal(room.snapshotFor('legacy')?.time, undefined);
  assert.equal(room.snapshotFor('legacy')?.players[0]?.stepTarget, undefined);
});

test('sala caminha à velocidade nominal sem perder tempo nas fronteiras dos tiles', () => {
  const room = new Room('origins');
  const guest = room.add('a', 'Hero', true);
  for (let i = 0; i < 20; i++) {
    room.receiveInput('a', 1, 0, false);
    room.tick(0.05);
  }
  assert.ok(Math.abs(guest.actor.x - 142) < 1e-7);
  room.receiveInput('a', 0, 0, false);
  for (let i = 0; i < 10; i++) room.tick(0.05);
  assert.deepEqual([guest.actor.x, guest.actor.y], [144, 16]);
});


test('espada da sala acompanha o alvo durante o preparo antes de aplicar dano', () => {
  const room = new Room('origins');
  const guest = room.add('a', 'Hero', true, true);
  Object.assign(guest.actor, { x: -3984, y: -4016 });
  let now = guest.lastInputAt;
  for (let i = 0; i < 32; i++) room.tick(0.05, now += 50);
  room.receiveTarget('a', '-8,-8,0');
  room.tick(0.05, now += 50);
  assert.ok(guest.actor.attackTime > 0);
  const mob = room.snapshotFor('a')!.mobs.find(m => m.id === '-8,-8,0')!;
  const dx = mob.x - guest.actor.x, dy = mob.y - guest.actor.y;
  const distance = Math.hypot(dx, dy);
  guest.actor.faceX = -dx / distance; guest.actor.faceY = -dy / distance;
  room.tick(0.05, now += 50);
  assert.equal(room.snapshotFor('a')!.mobs.find(m => m.id === mob.id)!.hp, 2);
  assert.ok((guest.actor.faceX * dx + guest.actor.faceY * dy) / distance > 0.95);
});

test('um destino bloqueado recebido durante a caminhada preserva a rota autoritativa', () => {
  const room = new Room('origins');
  const guest = room.add('a', 'Aventureiro', true);
  Object.assign(guest.actor, { x: 240, y: -144 });
  const destination = { x: 304, y: -48 };
  const wall = { x: 336, y: -112 };
  assert.equal(room.world.canMove(wall.x, wall.y), false);

  let now = guest.lastInputAt;
  room.receiveWalk('a', destination);
  room.tick(0.05, now += 50);
  assert.ok(guest.walking?.walker.destination);
  room.receiveWalk('a', wall);
  for (let frame = 0; frame < 8; frame++) {
    room.tick(0.05, now += 50);
    assert.deepEqual(room.snapshotFor('a')?.walkTarget, destination);
  }
  for (let frame = 0; frame < 40; frame++) room.tick(0.05, now += 50);
  assert.deepEqual([guest.actor.x, guest.actor.y], [destination.x, destination.y]);
  assert.equal(room.snapshotFor('a')?.walkTarget, null);
});

test('dano cancela a rota em curso e aceita a próxima ordem de caminhada', () => {
  const room = new Room('origins');
  const guest = room.add('a', 'Hero', true);
  Object.assign(guest.actor, { x: -592, y: -1008 });
  let now = guest.lastInputAt;
  for (let frame = 0; frame < 31; frame++) room.tick(0.05, now += 50);

  room.receiveWalk('a', { x: -464, y: -1008 });
  room.tick(0.05, now += 50);
  assert.equal(guest.actor.hp, 91);
  assert.deepEqual(guest.walking?.walker.destination, { x: -560, y: -1008 });
  assert.equal(room.snapshotFor('a')?.walkTarget, null);

  // The new order arrives during the flash and before the next planning slot.
  const escape = { x: -560, y: -912 };
  room.receiveWalk('a', escape);
  for (let frame = 0; frame < 25; frame++) room.tick(0.05, now += 50);
  assert.deepEqual([guest.actor.x, guest.actor.y], [escape.x, escape.y]);
  assert.equal(room.snapshotFor('a')?.walkTarget, null);
});

test('sala com planejamento disponível inicia a fuga durante o efeito de dano', () => {
  const room = new Room('origins');
  const guest = room.add('a', 'Hero', true);
  Object.assign(guest.actor, { x: -560, y: -1008 });
  let now = guest.lastInputAt;
  for (let frame = 0; frame < 30; frame++) room.tick(0.05, now += 50);
  assert.equal(guest.actor.hp, 91);

  const escape = { x: -464, y: -1008 };
  room.receiveWalk('a', escape);
  room.tick(0.05, now += 50);
  assert.ok(guest.actor.hurtTime > 0);
  assert.ok(guest.actor.x > -560);
  assert.deepEqual(room.snapshotFor('a')?.walkTarget, escape);
});
