import { execFileSync } from 'node:child_process';
import { realpathSync, readFileSync, statSync } from 'node:fs';
import { extname, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createNavigationApi } from '../../../scripts/ai-navigation-api.mjs';
import { normalizeScope } from '../../../scripts/find-ai-files.mjs';

const SOURCE_EXTS = new Set(['.ts','.tsx','.mts','.cts','.js','.mjs','.cjs','.jsx',
  '.go','.rs','.py','.java','.c','.h','.cpp','.hpp','.cs','.sql','.proto',
  '.json','.jsonc','.toml','.yml','.yaml','.css','.scss','.html','.md','.sh']);
const BLOCKED_SEGMENTS = new Set(['node_modules','dist','build','coverage','target','.git',
  '.angular','.next','.turbo','vendor','test-results','playwright-report']);
const SECRET_NAME = /(?:^\.env(?:\.|$)|\.pem$|\.key$|\.p12$|\.pfx$|^id_(?:rsa|ed25519)|(?:secret|credential|private[_-]?key))/i;
const MAX_SOURCE_BYTES = 256 * 1024;
const MAX_LINE_WIDTH = 400;
const MAX_SEARCH_FILES = 1500;
const MAX_SEARCH_HITS = 50;
export const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

function safeTrackedPath(path: string): boolean {
  if (!path || path.includes('\0') || path.startsWith('/') || /^[a-z]:/i.test(path)) return false;
  const parts = path.split('/');
  if (parts.some(part => !part || part === '.' || part === '..' || BLOCKED_SEGMENTS.has(part))) return false;
  return !SECRET_NAME.test(parts.at(-1) ?? '');
}
function ensurePositive(value: number, max: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 1 || value > max)
    throw new Error(label + ' deve estar entre 1 e ' + max + '.');
}
function readInside(root: string, path: string, maxBytes: number): string {
  const base = realpathSync(root);
  const actual = realpathSync(resolve(base, path));
  const local = relative(base, actual);
  if (isAbsolute(local) || local === '..' || local.startsWith('..' + sep))
    throw new Error('Arquivo fora da raiz autorizada.');
  const stat = statSync(actual);
  if (!stat.isFile() || stat.size > maxBytes) throw new Error('Arquivo não textual ou muito grande.');
  const text = readFileSync(actual, 'utf8');
  if (text.includes('\0')) throw new Error('Arquivo binário não permitido.');
  return text;
}

type NavigationCore = {
  find: (options: { query: string; scope: string; limit: number }) => Record<string, unknown>;
  audit: (options: { scope: string; minFiles: number; limit: number; depth: number }) => Record<string, unknown>;
  guide: (options: { scope: string; maxChars: number }) => Record<string, unknown>;
};

function makeSnapshot(root: string, paths: readonly string[]) {
  const tracked = [...new Set(paths.filter(safeTrackedPath))].sort();
  const known = new Set(tracked);
  // The navigation core is maintained in JavaScript; define its typed boundary here.
  const navigation = createNavigationApi(tracked, {
    readGuide: (path: string) => {
      if (!known.has(path) || !(path === 'AGENTS.md' || path.endsWith('/INDEX.md')))
        throw new Error('Guia não autorizado.');
      return readInside(root, path, 128 * 1024);
    },
  }) as unknown as NavigationCore;
  return { tracked, known, navigation, key: tracked.join('\0') };
}

/**
 * A loader, when supplied, refreshes the Git index at the start of every MCP
 * operation. No watcher, timer, or restart is required after git add/rm.
 * An index-read error propagates instead of falling back to stale permissions.
 */
export function createRepository(
  root: string,
  trackedPaths: readonly string[],
  reloadTrackedPaths?: () => readonly string[],
) {
  let snapshot = makeSnapshot(root, trackedPaths);
  function current() {
    if (reloadTrackedPaths) {
      const latest = [...new Set(reloadTrackedPaths().filter(safeTrackedPath))].sort();
      if (latest.join('\0') !== snapshot.key)
        snapshot = makeSnapshot(root, latest);
    }
    return snapshot;
  }
  function authorize(known: ReadonlySet<string>, path: string): string {
    const normalized = normalizeScope(path);
    if (!normalized || !safeTrackedPath(normalized) || !known.has(normalized))
      throw new Error('Arquivo não versionado ou não autorizado.');
    if (!SOURCE_EXTS.has(extname(normalized).toLowerCase()))
      throw new Error('Somente arquivos de código e documentação textual.');
    return normalized;
  }
  return {
    find(query: string, scope = '', limit = 20) {
      return current().navigation.find({ query, scope, limit });
    },
    audit(scope = '', minFiles = 20, limit = 15, depth = 5) {
      return current().navigation.audit({ scope, minFiles, limit, depth });
    },
    guide(scope = '', maxChars = 8000) {
      return current().navigation.guide({ scope, maxChars });
    },
    readLines(path: string, startLine = 1, maxLines = 60) {
      ensurePositive(startLine, 1_000_000, 'startLine');
      ensurePositive(maxLines, 100, 'maxLines');
      const name = authorize(current().known, path);
      const lines = readInside(root, name, MAX_SOURCE_BYTES).split(/\r?\n/);
      const selected = lines.slice(startLine - 1, startLine - 1 + maxLines);
      return { schemaVersion: 1, kind: 'read_source_lines', path: name,
        startLine, endLine: startLine + selected.length - 1, totalLines: lines.length,
        lines: selected.map((text, index) => ({
          number: startLine + index, text: text.slice(0, MAX_LINE_WIDTH),
          truncated: text.length > MAX_LINE_WIDTH,
        })) };
    },
    searchSymbols(query: string, scope = '', limit = 20) {
      if (typeof query !== 'string' || query.trim().length < 2 || query.length > 128 || /[\r\n\0]/.test(query))
        throw new Error('Termo de pesquisa deve ter 2 a 128 caracteres, sem quebras de linha.');
      ensurePositive(limit, MAX_SEARCH_HITS, 'limit');
      const folder = normalizeScope(scope);
      const candidatePaths = current().tracked.filter(path =>
        SOURCE_EXTS.has(extname(path).toLowerCase()) &&
        (!folder || path === folder || path.startsWith(folder + '/')));
      const totalEligible = candidatePaths.length;
      const matches: Array<{path: string; line: number; text: string}> = [];
      let scannedFiles = 0;
      let skippedFiles = 0;
      const needle = query.toLocaleLowerCase('en');
      for (const path of candidatePaths) {
        if (scannedFiles >= MAX_SEARCH_FILES || matches.length >= limit) break;
        scannedFiles++;
        let text: string;
        try { text = readInside(root, path, MAX_SOURCE_BYTES); }
        catch { skippedFiles++; continue; }
        const lines = text.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i] ?? '';
          if (line.toLocaleLowerCase('en').includes(needle)) {
            matches.push({ path, line: i + 1, text: line.slice(0, MAX_LINE_WIDTH) });
            if (matches.length >= limit) break;
          }
        }
      }
      return { schemaVersion: 1, kind: 'search_symbols', query, scope: folder, limit,
        matches, count: matches.length, scannedFiles, totalEligible, skippedFiles,
        partial: scannedFiles < totalEligible };
    },
  };
}

export function openLocalRepository() {
  const root = REPOSITORY_ROOT;
  const discovered = realpathSync(execFileSync('git', ['rev-parse', '--show-toplevel'],
    { cwd: root, encoding: 'utf8', timeout: 5000 }).trim());
  if (discovered !== realpathSync(root)) throw new Error('Raiz Git inesperada.');
  const readIndex = () => execFileSync('git', ['ls-files', '-z'], {
    cwd: root, encoding: 'utf8', timeout: 5000, maxBuffer: 16 * 1024 * 1024,
  }).split('\0').filter(Boolean);
  return createRepository(root, readIndex(), readIndex);
}
