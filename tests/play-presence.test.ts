import assert from 'node:assert/strict';
import test from 'node:test';
import { heartbeatEndpoint, parsePresence } from '../src/net/presence.ts';
import { startPlayPresence } from '../src/app/play-presence.ts';

test('sinal de presença: endereço derivado do mesmo servidor e com a mesma exigência de HTTPS', () => {
  assert.equal(heartbeatEndpoint('wss://example.test/ws?room=x'), 'https://example.test/presence/heartbeat');
  assert.equal(heartbeatEndpoint('ws://127.0.0.1:8787/ws'), 'http://127.0.0.1:8787/presence/heartbeat');
  assert.equal(heartbeatEndpoint('', 'https://status.example.test/presence'), 'https://status.example.test/presence/heartbeat');
  for (const bad of ['', 'invalid', 'ws://remote.test/ws', 'wss://u:p@remote.test/ws']) assert.equal(heartbeatEndpoint(bad), null);
});

test('presença: aceita resposta sem salas (servidor Node atual) e continua rejeitando valores inválidos', () => {
  const base = { online: 3, scope: 'server', updatedAt: new Date().toISOString() };
  assert.deepEqual(parsePresence(base), base);
  assert.deepEqual(parsePresence({ ...base, rooms: 2 }), { ...base, rooms: 2 });
  for (const bad of [{ ...base, rooms: -1 }, { ...base, rooms: '2' }, { ...base, online: -1 }]) assert.equal(parsePresence(bad), null);
});

test('sinal de presença: envia ao iniciar e a cada intervalo, sempre com o mesmo id anônimo', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const calls: { url: string; id: string }[] = [];
  const stop = startPlayPresence({ endpoint: 'https://example.test/presence/heartbeat', intervalMs: 20_000,
    newId: () => 'aba-aleatoria-0001', isVisible: () => true,
    send: async (url, body) => { calls.push({ url, id: JSON.parse(body).id }); } });
  assert.equal(calls.length, 1, 'envia logo ao iniciar');
  t.mock.timers.tick(20_000);
  t.mock.timers.tick(20_000);
  assert.equal(calls.length, 3);
  assert.deepEqual(new Set(calls.map(c => c.id)), new Set(['aba-aleatoria-0001']));
  stop();
  t.mock.timers.tick(60_000);
  assert.equal(calls.length, 3, 'depois de parar não envia mais nada');
});

test('sinal de presença: aba escondida não conta, falha de rede é ignorada e sem endereço não faz nada', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  let visible = false, sent = 0;
  const stop = startPlayPresence({ endpoint: 'https://example.test/presence/heartbeat', newId: () => 'x'.repeat(16),
    isVisible: () => visible, send: async () => { sent++; throw new Error('sem rede'); } });
  t.mock.timers.tick(40_000);
  assert.equal(sent, 0, 'escondida: não está jogando');
  visible = true;
  t.mock.timers.tick(20_000);
  assert.equal(sent, 1);
  await new Promise(resolve => setImmediate(resolve)); // a rejeição foi engolida: nada vazou
  stop();
  let none = 0;
  startPlayPresence({ endpoint: null, send: async () => { none++; } })();
  assert.equal(none, 0);
});
