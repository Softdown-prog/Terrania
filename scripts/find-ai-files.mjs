import { execFileSync } from 'node:child_process';
import { basename, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function normalizeScope(scope = '') {
  if (typeof scope !== 'string') throw new Error('Escopo deve ser texto.');
  let value = scope.trim().replaceAll('\\', '/');
  if (value.startsWith('./')) value = value.slice(2);
  if (value.endsWith('/')) value = value.slice(0, -1);
  if (value.startsWith('/') || /^[A-Za-z]:/.test(value) ||
      value.split('/').some(part => part === '..' || part === '' || part === '.'))
    throw new Error('Escopo inválido: use caminho relativo dentro do repositório.');
  return value;
}

/** Resolve by tracked path names only: never reads source files or dumps the full tree. */
export function findFiles(paths, query, { scope = '', limit = 20 } = {}) {
  if (typeof query !== 'string' || !query.trim())
    throw new Error('Informe o nome do arquivo ou parte do caminho.');
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
    throw new Error('O limite deve ser de 1 a 100.');
  const folder = normalizeScope(scope).toLowerCase();
  const needle = query.trim().toLowerCase();
  const terms = needle.split(/\s+/).filter(Boolean);
  return paths.filter(path => {
    const lower = path.toLowerCase();
    return (!folder || lower.startsWith(folder + '/') || lower === folder) &&
      terms.every(term => lower.includes(term));
  }).map(path => {
    const lower = path.toLowerCase();
    const filename = basename(lower);
    const stem = filename.slice(0, filename.length - extname(filename).length);
    const rank = (filename === needle || stem === needle) ? 0 :
      filename.startsWith(needle) ? 1 :
      filename.includes(needle) ? 2 :
      lower.includes('/' + needle + '/') ? 3 : 4;
    return { path, rank };
  }).sort((a, b) => a.rank - b.rank ||
    a.path.toLowerCase().localeCompare(b.path.toLowerCase()) ||
    a.path.localeCompare(b.path)).slice(0, limit).map(item => item.path);
}

export function parseOptions(args) {
  let scope = '';
  let limit = 20;
  let json = false;
  const words = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--json') { json = true; continue; }
    if (arg === '--scope' || arg === '--limit') {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw new Error('Falta valor para ' + arg);
      if (arg === '--scope') scope = value;
      else limit = Number(value);
      continue;
    }
    if (arg.startsWith('--scope=')) { scope = arg.slice(8); continue; }
    if (arg.startsWith('--limit=')) { limit = Number(arg.slice(8)); continue; }
    if (arg.startsWith('-')) throw new Error('Opção desconhecida: ' + arg);
    words.push(arg);
  }
  return { query: words.join(' '), scope: normalizeScope(scope), limit, json };
}

function main() {
  try {
    const { query, scope, limit, json } = parseOptions(process.argv.slice(2));
    const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
    const tracked = execFileSync('git', ['ls-files', '-z'], {
      cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    }).split('\0').filter(Boolean);
    const matches = findFiles(tracked, query, { scope, limit });
    if (json) console.log(JSON.stringify({ query, scope, limit, count: matches.length, files: matches }));
    else if (matches.length) console.log(matches.join('\n'));
    else console.log('Nenhum arquivo versionado corresponde à busca.');
  } catch (error) {
    console.error('Uso: npm run ai:find -- <nome> [--scope src/engine] [--limit 20] [--json]');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
