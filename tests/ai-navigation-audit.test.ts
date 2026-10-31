import assert from 'node:assert/strict';
import test from 'node:test';
import { auditDirectories, parseAuditOptions } from '../scripts/audit-ai-navigation.mjs';

const paths = [
  'src/INDEX.md', 'src/engine/INDEX.md', 'src/engine/OfflineSimulation.ts',
  'src/engine/combat.ts', 'src/engine/loot.ts', 'src/game/PhaserGame.ts',
  'src/game/Game.ts', 'src/game/events.ts', 'server-go/INDEX.md',
  'server-go/engine/room.go', 'server-go/engine/world.go',
  'docs/ARQUITETURA.md', 'docs/ROADMAP.md',
  'node_modules/tool/index.ts', 'dist/main.js', 'rust/spatial-kernel/target/release/code.rs',
  'public/art/hero.png',
];

test('auditoria identifica módulos sem índice e mantém resumo pequeno', () => {
  const audit = auditDirectories(paths, { minFiles: 2, limit: 2 });
  assert.equal(audit.sourceFiles, 10);
  assert.equal(audit.indexed, 3);
  assert.deepEqual(audit.largest.map(x => x.path), ['src', 'src/engine']);
  assert.deepEqual(audit.missing.map(x => x.path), ['src/game', 'docs']);
  assert.equal(audit.candidates, 3); // Also server-go/engine has no local index.
});

test('escopo e profundidade restringem dados sem abrir fontes', () => {
  const audit = auditDirectories(paths, { scope: './src/', minFiles: 1, depth: 1 });
  assert.equal(audit.sourceFiles, 6);
  assert.equal(audit.directories, 1);
  assert.equal(audit.largest[0]?.path, 'src');
  assert.deepEqual(audit.missing, []);
});

test('funciona com 15000 arquivos e mostra apenas os primeiros módulos', () => {
  const large = Array.from({ length: 15000 }, (_, i) =>
    'src/features/module-' + String(i % 150).padStart(3, '0') +
    '/file-' + String(i) + '.ts');
  const audit = auditDirectories(large, { minFiles: 40, limit: 10 });
  assert.equal(audit.sourceFiles, 15000);
  assert.equal(audit.largest.length, 10);
  assert.equal(audit.missing.length, 10);
  assert.equal(audit.candidates, 152);
  assert.equal(audit.largest[0]?.path, 'src');
});

test('opções controlam escopo, limiares e saída JSON', () => {
  assert.deepEqual(parseAuditOptions([
    '--scope=server-go', '--min-files', '40', '--limit=5', '--depth', '3', '--json',
  ]), { scope: 'server-go', minFiles: 40, limit: 5, depth: 3, json: true });
  assert.throws(() => parseAuditOptions(['--unknown']));
  assert.throws(() => parseAuditOptions(['--scope']));
  for (const minFiles of [0, NaN, 1.2, 100001]) {
    assert.throws(() => auditDirectories(paths, { minFiles }));
  }
  assert.throws(() => auditDirectories(paths, { depth: 0 }));
  assert.throws(() => auditDirectories(paths, { limit: 101 }));
  assert.throws(() => auditDirectories(paths, { scope: '../outside' }));
});
