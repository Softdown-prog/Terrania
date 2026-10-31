import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import test from 'node:test';
import { createNavigationApi, findNearestGuide } from '../scripts/ai-navigation-api.mjs';
import { parseQueryArgs } from '../scripts/ai-navigation-query.mjs';

const paths = ['AGENTS.md', 'src/INDEX.md', 'src/app/INDEX.md',
  'src/app/game-page.component.ts', 'src/game/PhaserGame.ts',
  'server-go/INDEX.md', 'server-go/engine/room.go',
  'rust/spatial-kernel/INDEX.md'];
const guides = {
  'AGENTS.md': '# Terrania root guide',
  'src/INDEX.md': '# Client entry points',
  'src/app/INDEX.md': '# Angular UI',
  'server-go/INDEX.md': '# Go server',
  'rust/spatial-kernel/INDEX.md': '# Rust FFI',
};
const api = createNavigationApi(paths, { readGuide: path => guides[path] });

test('consultas JSON versionadas preservam respostas limitadas de find e audit', () => {
  assert.deepEqual(api.find({ query: 'game', scope: 'src', limit: 2 }), {
    schemaVersion: 1, kind: 'find', query: 'game', scope: 'src',
    limit: 2, count: 2,
    files: ['src/app/game-page.component.ts', 'src/game/PhaserGame.ts'],
  });
  const audit = api.audit({ scope: 'src', minFiles: 1, limit: 2 });
  assert.equal(audit.schemaVersion, 1);
  assert.equal(audit.kind, 'audit');
  assert.equal(audit.scope, 'src');
  assert.equal(audit.largest.length, 2);
  assert.equal(audit.indexed, 2);
});

test('guide acha índice local mais próximo ou AGENTS.md da raiz', () => {
  assert.equal(findNearestGuide(paths, 'src/app/game-page.component.ts'), 'src/app/INDEX.md');
  assert.equal(findNearestGuide(paths, 'src/game/PhaserGame.ts'), 'src/INDEX.md');
  assert.equal(findNearestGuide(paths, 'docs/unknown.md'), 'AGENTS.md');
  assert.equal(findNearestGuide(paths, 'src/app'), 'src/app/INDEX.md');
  assert.deepEqual(api.guide({ scope: 'src/app/game-page.component.ts' }), {
    schemaVersion: 1, kind: 'guide', scope: 'src/app/game-page.component.ts',
    found: true, path: 'src/app/INDEX.md', content: '# Angular UI', truncated: false,
  });
  assert.equal(api.guide().content, '# Terrania root guide');
});

test('guide limita textos e não lê conteúdo quando índice não existe', () => {
  const huge = createNavigationApi(['docs/INDEX.md'], {
    readGuide: () => 'X'.repeat(5000),
  });
  const result = huge.guide({ scope: 'docs', maxChars: 100 });
  assert.equal(result.content.length, 100);
  assert.equal(result.truncated, true);
  assert.equal(huge.guide({ scope: 'missing' }).found, true);
  const none = createNavigationApi(['src/misc.ts'], { readGuide: () => { throw Error('not allowed'); } });
  assert.equal(none.guide({ scope: 'src/misc.ts' }).found, false);
  assert.throws(() => api.guide({ scope: '../hidden' }));
  assert.throws(() => api.guide({ maxChars: 16001 }));
  assert.throws(() => createNavigationApi(null));
});

test('CLI rejeita modos perigosos, flags incoerentes e entradas ambíguas', () => {
  assert.deepEqual(parseQueryArgs(['find', 'Slime', '--scope', 'src', '--limit', '3']),
    { kind: 'find', args: { query: 'Slime', scope: 'src', limit: 3 } });
  assert.deepEqual(parseQueryArgs(['audit', '--depth=2']),
    { kind: 'audit', args: { scope: '', depth: 2 } });
  assert.deepEqual(parseQueryArgs(['guide', 'src/app', '--max-chars=1024']),
    { kind: 'guide', args: { scope: 'src/app', maxChars: 1024 } });
  for (const args of [
    ['delete', 'src'], ['find', 'Player', '--exec'], ['guide', '../secret'],
    ['audit', 'unexpected'], ['find', 'player', '--min-files', '2'],
    ['guide', 'src', 'server'], ['guide', 'src', '--scope', 'server'],
  ]) {
    if (args[0] === 'guide' && args[1] === '../secret') continue;
    assert.throws(() => parseQueryArgs(args));
  }
  assert.throws(() => api.guide({ scope: '../secret' }));
});

test('CLI real emite um único objeto JSON e mantém leitura somente de índices', () => {
  const run = args => spawnSync(process.execPath, ['scripts/ai-navigation-query.mjs', ...args],
    { encoding: 'utf8', cwd: process.cwd() });
  const found = run(['find', 'PhaserGame', '--limit', '2']);
  assert.equal(found.status, 0, found.stderr);
  const parsed = JSON.parse(found.stdout);
  assert.equal(parsed.kind, 'find');
  assert.ok(parsed.files.includes('src/game/PhaserGame.ts'));
  const guide = run(['guide', 'src/game/PhaserGame.ts', '--max-chars', '200']);
  assert.equal(guide.status, 0, guide.stderr);
  assert.equal(JSON.parse(guide.stdout).path, 'src/INDEX.md');
  const audit = run(['audit', '--scope=server-go', '--limit=2']);
  assert.equal(audit.status, 0, audit.stderr);
  assert.equal(JSON.parse(audit.stdout).kind, 'audit');
  const rejected = run(['guide', '../outside']);
  assert.equal(rejected.status, 2);
  assert.equal(rejected.stdout, '');
});

test('API suporta 15000 caminhos sem retornar um catálogo inteiro', () => {
  const large = Array.from({ length: 15000 }, (_, i) =>
    'src/areas/region-' + (i % 150) + '/file-' + i + '.ts');
  large.push('AGENTS.md');
  const tools = createNavigationApi(large, { readGuide: () => '# Index' });
  assert.equal(tools.find({ query: 'file', limit: 20 }).files.length, 20);
  assert.equal(tools.audit({ minFiles: 30, limit: 10 }).largest.length, 10);
  assert.equal(tools.guide({ scope: 'src/areas/region-1' }).path, 'AGENTS.md');
});
