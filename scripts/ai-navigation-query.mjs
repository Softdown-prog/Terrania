import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createNavigationApi } from './ai-navigation-api.mjs';

const MAX_GUIDE_FILE_BYTES = 128 * 1024;
const knownKinds = new Set(['find', 'audit', 'guide']);

export function parseQueryArgs(args) {
  const [kind, ...tokens] = args;
  if (!knownKinds.has(kind)) throw new Error('Comando deve ser find, audit ou guide.');
  let scope = '', limit, minFiles, depth, maxChars;
  const words = [];
  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (arg === '--json') continue; // JSON é sempre a saída; opção mantida por conveniência.
    const split = arg.indexOf('=');
    const key = split > 0 ? arg.slice(0, split) : arg;
    if (['--scope', '--limit', '--min-files', '--depth', '--max-chars'].includes(key)) {
      const value = split > 0 ? arg.slice(split + 1) : tokens[++i];
      if (!value || value.startsWith('--')) throw new Error('Falta valor para ' + key);
      if (key === '--scope') scope = value;
      else {
        if (!/^[0-9]+$/.test(value)) throw new Error('Valor numérico inválido para ' + key);
        const count = Number(value);
        if (key === '--limit') limit = count;
        else if (key === '--min-files') minFiles = count;
        else if (key === '--depth') depth = count;
        else maxChars = count;
      }
    } else if (arg.startsWith('-')) throw new Error('Opção desconhecida: ' + arg);
    else words.push(arg);
  }
  if (kind === 'find') {
    if (minFiles !== undefined || depth !== undefined || maxChars !== undefined)
      throw new Error('Parâmetro não aceito por find.');
    return { kind, args: { query: words.join(' '), scope, ...(limit === undefined ? {} : { limit }) } };
  }
  if (kind === 'audit') {
    if (words.length || maxChars !== undefined)
      throw new Error('audit não recebe busca posicional nem max-chars.');
    return { kind, args: { scope, ...(limit === undefined ? {} : { limit }),
      ...(minFiles === undefined ? {} : { minFiles }),
      ...(depth === undefined ? {} : { depth }) } };
  }
  if (words.length > 1 || limit !== undefined || minFiles !== undefined || depth !== undefined ||
      (scope && words.length)) throw new Error('guide aceita um único caminho e --max-chars.');
  return { kind, args: { scope: scope || words[0] || '',
    ...(maxChars === undefined ? {} : { maxChars }) } };
}

/** Read only a versioned guide whose real path remains inside repository. */
export function readTrackedGuide(root, path) {
  const absolute = resolve(root, path);
  const realRoot = realpathSync(root);
  const real = realpathSync(absolute);
  const rel = relative(realRoot, real);
  if (isAbsolute(rel) || rel === '..' || rel.startsWith('..' + sep))
    throw new Error('Índice fora do repositório.');
  const stat = statSync(real);
  if (!stat.isFile() || stat.size > MAX_GUIDE_FILE_BYTES)
    throw new Error('Índice inválido ou muito grande.');
  return readFileSync(real, 'utf8');
}

function main() {
  try {
    const request = parseQueryArgs(process.argv.slice(2));
    const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
    const paths = execFileSync('git', ['ls-files', '-z'], {
      cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    }).split('\0').filter(Boolean);
    const tools = createNavigationApi(paths, { readGuide: path => readTrackedGuide(root, path) });
    console.log(JSON.stringify(tools[request.kind](request.args)));
  } catch (error) {
    console.error('Uso: npm run ai:query -- find <nome> [--scope src] [--limit 20]');
    console.error('     npm run ai:query -- audit [--scope server-go] [--min-files 20]');
    console.error('     npm run ai:query -- guide [caminho] [--max-chars 8000]');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
