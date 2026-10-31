import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePresence, presenceEndpoint } from '../src/net/presence.ts';

test('presença distingue zero real de resposta inválida ou contador estimado', () => {
  const valid = { online: 0, rooms: 0, scope: 'server', updatedAt: new Date().toISOString() };
  assert.deepEqual(parsePresence(valid), valid);
  for (const bad of [null, {}, { ...valid, online: '5' }, { ...valid, online: -1 },
    { ...valid, online: 0.5 }, { ...valid, online: Infinity }, { ...valid, rooms: -1 },
    { ...valid, scope: 'single-gateway-admission-only' }, { ...valid, updatedAt: 'invalid' }])
    assert.equal(parsePresence(bad), null);
});

test('endpoint deriva HTTP(S) sem herdar sala/segredo e exige transporte seguro fora de localhost', () => {
  assert.equal(presenceEndpoint('wss://example.test/ws?room=mine#test'), 'https://example.test/presence');
  assert.equal(presenceEndpoint('ws://127.0.0.1:8787/ws'), 'http://127.0.0.1:8787/presence');
  assert.equal(presenceEndpoint('wss://example.test/ws', 'https://status.example.test/presence'), 'https://status.example.test/presence');
  for (const url of ['', 'invalid', 'ws://remote.test/ws', 'https://remote.test/ws', 'wss://user:password@remote.test/ws'])
    assert.equal(presenceEndpoint(url), null);
});
