import { execFileSync } from 'node:child_process';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { normalizeScope } from './find-ai-files.mjs';

const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.cjs', '.jsx',
  '.go', '.rs', '.html', '.css', '.scss', '.sql', '.proto',
  '.py', '.json', '.jsonc', '.toml', '.yml', '.yaml', '.md',
]);
const SKIP_PARTS = new Set([
  'node_modules', 'dist', 'build', 'coverage', 'target', '.angular',
  '.git', '.next', '.turbo', 'vendor', 'test-results', 'playwright-report',
]);
const GUIDE_NAMES = new Set(['INDEX.md', 'AGENTS.md', 'GEMINI.md']);

function isSource(path) {
  const parts = path.split('/');
  if (parts.some(part => SKIP_PARTS.has(part))) return false;
  const name = parts.at(-1) ?? '';
  return !GUIDE_NAMES.has(name) && CODE_EXTENSIONS.has(extname(name).toLowerCase());
}

/** Summarize tracked, editable source per directory, without reading file contents. */
export function auditDirectories(paths, { scope = '', minFiles = 20, limit = 15, depth = 5 } = {}) {
  const folder = normalizeScope(scope);
  if (!Number.isSafeInteger(minFiles) || minFiles < 1 || minFiles > 100000)
    throw new Error('minFiles deve ser um inteiro entre 1 e 100000.');
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
    throw new Error('limit deve ser um inteiro de 1 a 100.');
  if (!Number.isSafeInteger(depth) || depth < 1 || depth > 15)
    throw new Error('depth deve ser um inteiro de 1 a 15.');

  const allPaths = new Set(paths);
  const modules = new Map();
  let sourceFiles = 0;
  for (const path of paths) {
    if (!isSource(path)) continue;
    if (folder && path !== folder && !path.startsWith(folder + '/')) continue;
    sourceFiles++;
    const parts = path.split('/');
    const lastDir = parts.length - 1;
    for (let i = 1; i <= Math.min(lastDir, depth); i++) {
      const dir = parts.slice(0, i).join('/');
      if (folder && dir !== folder && !dir.startsWith(folder + '/')) continue;
      let record = modules.get(dir);
      if (!record) {
        record = { path: dir, total: 0, direct: 0,
          indexed: allPaths.has(dir + '/INDEX.md') || allPaths.has(dir + '/AGENTS.md') };
        modules.set(dir, record);
      }
      record.total++;
      if (i === lastDir) record.direct++;
    }
  }
  const sorted = [...modules.values()].sort((a, b) =>
    b.total - a.total || a.path.localeCompare(b.path));
  const candidates = sorted.filter(item => !item.indexed && item.total >= minFiles);
  return {
    sourceFiles,
    directories: modules.size,
    indexed: [...modules.values()].filter(item => item.indexed).length,
    threshold: minFiles,
    candidates: candidates.length,
    largest: sorted.slice(0, limit),
    missing: candidates.slice(0, limit),
  };
}

export function parseAuditOptions(args) {
  let scope = '', minFiles = 20, limit = 15, depth = 5, json = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--json') { json = true; continue; }
    const [name, inline] = arg.split('=', 2);
    if (!['--scope', '--min-files', '--limit', '--depth'].includes(name))
      throw new Error('Opção desconhecida: ' + arg);
    const raw = inline ?? args[++i];
    if (!raw || raw.startsWith('--')) throw new Error('Falta valor para ' + name);
    if (name === '--scope') scope = raw;
    if (name === '--min-files') minFiles = Number(raw);
    if (name === '--limit') limit = Number(raw);
    if (name === '--depth') depth = Number(raw);
  }
  return { scope: normalizeScope(scope), minFiles, limit, depth, json };
}

function main() {
  try {
    const options = parseAuditOptions(process.argv.slice(2));
    const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
    const files = execFileSync('git', ['ls-files', '-z'], {
      cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    }).split('\0').filter(Boolean);
    const audit = auditDirectories(files, options);
    if (options.json) { console.log(JSON.stringify(audit)); return; }
    console.log(
      'Fontes versionadas: ' + audit.sourceFiles +
      ' | pastas: ' + audit.directories +
      ' | índices locais: ' + audit.indexed,
    );
    console.log('Pastas mais volumosas (total, diretos, índice):');
    for (const item of audit.largest) {
      console.log('  ' + item.total + ' / ' + item.direct + ' | ' +
        (item.indexed ? 'sim' : 'não') + ' | ' + item.path);
    }
    console.log('Candidatas a índice (' + audit.candidates + ' com >= ' +
      audit.threshold + ' arquivos):');
    for (const item of audit.missing) console.log('  ' + item.total + ' | ' + item.path);
    if (!audit.candidates) console.log('  Nenhuma pasta ultrapassa o limite sem índice próprio.');
  } catch (error) {
    console.error('Uso: npm run ai:audit -- [--scope src] [--min-files 20] [--depth 5] [--limit 15] [--json]');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
