import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('Phaser 3 solicitado pelo projeto tem lock reprodutível e integridade npm', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  assert.equal(pkg.dependencies.phaser, '3.90.0');
  assert.equal(lock.packages[''].dependencies.phaser, pkg.dependencies.phaser);
  assert.equal(lock.packages['node_modules/phaser'].version, pkg.dependencies.phaser);
  assert.match(lock.packages['node_modules/phaser'].integrity, /^sha512-/);
});
