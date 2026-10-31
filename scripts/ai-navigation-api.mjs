import { findFiles, normalizeScope } from './find-ai-files.mjs';
import { auditDirectories } from './audit-ai-navigation.mjs';

export const NAVIGATION_SCHEMA_VERSION = 1;
const MAX_GUIDE_CHARS = 16000;

/** Find the closest tracked INDEX.md, never guessing filesystem locations. */
export function findNearestGuide(paths, scope = '') {
  const known = new Set(paths);
  let folder = normalizeScope(scope);
  if (known.has(folder)) {
    if ((folder === 'AGENTS.md' || folder.endsWith('/INDEX.md')) &&
        (folder === 'AGENTS.md' || folder.split('/').at(-1) === 'INDEX.md')) return folder;
    folder = folder.includes('/') ? folder.slice(0, folder.lastIndexOf('/')) : '';
  }
  while (folder) {
    const candidate = folder + '/INDEX.md';
    if (known.has(candidate)) return candidate;
    folder = folder.includes('/') ? folder.slice(0, folder.lastIndexOf('/')) : '';
  }
  return known.has('AGENTS.md') ? 'AGENTS.md' : null;
}

/**
 * Pure read-only queries; a future MCP adapter can inject a readGuide
 * callback. No network, file system or shell access happens in this module.
 */
export function createNavigationApi(paths, { readGuide } = {}) {
  if (!Array.isArray(paths) || paths.some(path => typeof path !== 'string'))
    throw new TypeError('paths deve ser uma lista de caminhos do Git.');
  const tracked = Object.freeze([...new Set(paths)]);
  const indexed = new Set(tracked);
  return Object.freeze({
    find({ query, scope = '', limit = 20 } = {}) {
      const normalized = normalizeScope(scope);
      const files = findFiles(tracked, query, { scope: normalized, limit });
      return { schemaVersion: NAVIGATION_SCHEMA_VERSION, kind: 'find',
        query, scope: normalized, limit, count: files.length, files };
    },
    audit({ scope = '', minFiles = 20, limit = 15, depth = 5 } = {}) {
      const normalized = normalizeScope(scope);
      const result = auditDirectories(tracked, { scope: normalized, minFiles, limit, depth });
      return { schemaVersion: NAVIGATION_SCHEMA_VERSION, kind: 'audit', scope: normalized, ...result };
    },
    guide({ scope = '', maxChars = 8000 } = {}) {
      const normalized = normalizeScope(scope);
      if (!Number.isSafeInteger(maxChars) || maxChars < 100 || maxChars > MAX_GUIDE_CHARS)
        throw new Error('maxChars deve estar entre 100 e 16000.');
      const path = findNearestGuide(tracked, normalized);
      if (!path) return { schemaVersion: NAVIGATION_SCHEMA_VERSION,
        kind: 'guide', scope: normalized, found: false, path: null, content: null, truncated: false };
      if (!indexed.has(path)) throw new Error('Índice não versionado.');
      if (typeof readGuide !== 'function')
        throw new Error('Para consultar o índice, forneça readGuide ao adaptador.');
      const content = readGuide(path);
      if (typeof content !== 'string') throw new TypeError('O conteúdo do índice deve ser texto.');
      return { schemaVersion: NAVIGATION_SCHEMA_VERSION, kind: 'guide',
        scope: normalized, found: true, path, content: content.slice(0, maxChars),
        truncated: content.length > maxChars };
    },
  });
}
