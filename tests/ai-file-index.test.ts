import assert from 'node:assert/strict';
import test from 'node:test';
import { findFiles, normalizeScope, parseOptions } from '../scripts/find-ai-files.mjs';

const files = ['src/app/INDEX.md', 'src/actors/Player.ts', 'src/ui/PlayerIcon.ts',
  'src/game/Game.ts', 'server-go/engine/player.go', 'server-go/engine/room.go',
  'server-go/cmd/gateway/main.go', 'docs/AI_NAVIGATION.md'];

test('busca ordena o nome exato primeiro e respeita escopo', () => {
  assert.deepEqual(findFiles(files, 'player', { scope: 'src' }),
    ['src/actors/Player.ts', 'src/ui/PlayerIcon.ts']);
  assert.deepEqual(findFiles(files, 'player', { scope: 'server-go' }),
    ['server-go/engine/player.go']);
  assert.deepEqual(findFiles(files, 'engine', { scope: 'server-go' }),
    ['server-go/engine/player.go', 'server-go/engine/room.go']);
});

test('saída é limitada, determinística e ignora entradas fora da busca', () => {
  assert.deepEqual(findFiles(files, 'server-go', { limit: 1 }),
    ['server-go/cmd/gateway/main.go']);
  assert.deepEqual(findFiles(files, 'inexistente'), []);
  assert.deepEqual(findFiles(files, 'AI_NAVIGATION'), ['docs/AI_NAVIGATION.md']);
});

test('opções de CLI aceitam JSON e um escopo relativo', () => {
  assert.deepEqual(parseOptions(['slime', '--scope', './src/engine/', '--limit=5', '--json']),
    { query: 'slime', scope: 'src/engine', limit: 5, json: true });
  assert.equal(normalizeScope('src\\world'), 'src/world');
});

test('não permite travessia de pastas, limites inválidos ou flags desconhecidas', () => {
  for (const scope of ['/etc', '../secret', 'src/../other', 'src//engine', 'C:\\temp']) {
    assert.throws(() => normalizeScope(scope));
  }
  for (const limit of [0, 101, NaN, 1.5]) {
    assert.throws(() => findFiles(files, 'player', { limit }));
  }
  assert.throws(() => findFiles(files, ''));
  assert.throws(() => parseOptions(['player', '--unsafe']));
  assert.throws(() => parseOptions(['player', '--scope']));
});
