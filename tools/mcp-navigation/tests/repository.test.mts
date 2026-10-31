import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createRepository } from '../src/repository.mts';

test('navega em arquivos versionados, lê índices e limites de linhas', t => {
  const root = mkdtempSync(join(tmpdir(), 'terrania-mcp-'));
  t.after(() => rmSync(root, {recursive:true,force:true}));
  mkdirSync(join(root,'src','engine'),{recursive:true});
  writeFileSync(join(root,'AGENTS.md'),'# Agent root');
  writeFileSync(join(root,'src','INDEX.md'),'# Client');
  writeFileSync(join(root,'src','engine','room.ts'),'export class Room {}\nconst mob = new Room();\n');
  const repo=createRepository(root,['AGENTS.md','src/INDEX.md','src/engine/room.ts','.env','README.key']);
  assert.deepEqual(repo.find('room').files,['src/engine/room.ts']);
  assert.equal(repo.guide('src/engine/room.ts').path,'src/INDEX.md');
  assert.equal(repo.searchSymbols('Room','src/engine',10).matches.length,2);
  const content=repo.readLines('src/engine/room.ts',2,1);
  assert.equal(content.lines[0]?.number,2);
  assert.match(content.lines[0]?.text??'',/const mob/);
  assert.throws(()=>repo.readLines('../AGENTS.md'));
  assert.throws(()=>repo.readLines('.env'));
  assert.throws(()=>repo.readLines('README.key'));
});

test('bloqueia symlinks externos e evita buscas enormes', t => {
  const root=mkdtempSync(join(tmpdir(),'terrania-mcp-'));
  const external=mkdtempSync(join(tmpdir(),'terrania-external-'));
  t.after(()=>{rmSync(root,{recursive:true,force:true});rmSync(external,{recursive:true,force:true});});
  mkdirSync(join(root,'src'));
  writeFileSync(join(external,'secret.ts'),'const SECRET = "outside";');
  symlinkSync(join(external,'secret.ts'),join(root,'src','link.ts'));
  const repo=createRepository(root,['src/link.ts']);
  assert.throws(()=>repo.readLines('src/link.ts'),/fora da raiz/);
  const result=repo.searchSymbols('secret');
  assert.equal(result.count,0);
  assert.equal(result.skippedFiles,1);
});

test('pesquisa em 2000 arquivos é limitada a 1500 sem ler todos', t => {
  const root=mkdtempSync(join(tmpdir(),'terrania-mcp-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const paths=Array.from({length:2000},(_,i)=>'src/file-'+String(i).padStart(4,'0')+'.ts');
  const repo=createRepository(root,paths);
  const result=repo.searchSymbols('find_this', 'src');
  assert.equal(result.totalEligible,2000);
  assert.equal(result.scannedFiles,1500);
  assert.equal(result.partial,true);
  assert.equal(result.skippedFiles,1500);
  assert.throws(()=>repo.searchSymbols('a'));
  assert.throws(()=>repo.readLines('src/file-0001.ts',1,101));
});

test('atualiza o índice Git sem reiniciar e revoga arquivos removidos', t => {
  const root = mkdtempSync(join(tmpdir(), 'terrania-mcp-git-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q'], { cwd: root });
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, 'AGENTS.md'), '# Guia raiz');
  writeFileSync(join(root, 'src', 'old.ts'), 'export const VALUE = 1;');
  execFileSync('git', ['add', '--', 'AGENTS.md', 'src/old.ts'], { cwd: root });
  const readIndex = () => execFileSync('git', ['ls-files', '-z'], {
    cwd: root, encoding: 'utf8',
  }).split('\\0').filter(Boolean);
  const repo = createRepository(root, readIndex(), readIndex);
  assert.deepEqual(repo.find('old').files, ['src/old.ts']);
  assert.equal(repo.readLines('src/old.ts').lines.length, 1);

  // A new file must first be staged: untracked files are never readable.
  writeFileSync(join(root, 'src', 'fresh.ts'), 'export const NEW_SYMBOL = true;');
  assert.deepEqual(repo.find('fresh').files, []);
  assert.throws(() => repo.readLines('src/fresh.ts'), /não versionado/);
  execFileSync('git', ['add', '--', 'src/fresh.ts'], { cwd: root });
  assert.deepEqual(repo.find('fresh').files, ['src/fresh.ts']);
  assert.equal(repo.searchSymbols('NEW_SYMBOL').matches[0]?.path, 'src/fresh.ts');
  assert.equal(repo.readLines('src/fresh.ts').lines[0]?.text, 'export const NEW_SYMBOL = true;');

  // Files removed from the Git index remain on disk, but lose read access.
  execFileSync('git', ['rm', '--cached', '--', 'src/old.ts'], { cwd: root });
  assert.deepEqual(repo.find('old').files, []);
  assert.throws(() => repo.readLines('src/old.ts'), /não versionado/);
  assert.equal(repo.searchSymbols('VALUE').count, 0);
  assert.equal(repo.guide('src/fresh.ts').path, 'AGENTS.md');

  // Reload cannot add secret files even if Git explicitly tracks them.
  writeFileSync(join(root, '.env'), 'TOKEN=hidden');
  execFileSync('git', ['add', '-f', '--', '.env'], { cwd: root });
  assert.deepEqual(repo.find('.env').files, []);
  assert.throws(() => repo.readLines('.env'));
});

test('falhas ao reler o índice Git nunca reabilitam cache desatualizado', () => {
  const root = mkdtempSync(join(tmpdir(), 'terrania-mcp-failure-'));
  try {
    const repo = createRepository(root, ['src/sensitive.ts'], () => {
      throw new Error('Falha na leitura do índice Git');
    });
    assert.throws(() => repo.find('sensitive'), /Falha na leitura/);
    assert.throws(() => repo.guide('src'), /Falha na leitura/);
    assert.throws(() => repo.readLines('src/sensitive.ts'), /Falha na leitura/);
    assert.throws(() => repo.searchSymbols('sensitive'), /Falha na leitura/);
    assert.throws(() => repo.audit(), /Falha na leitura/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
