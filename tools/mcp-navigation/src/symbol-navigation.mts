/** Bounded lexical symbol discovery; not an AST, compiler, or LSP. */
export type SymbolLanguage = 'typescript' | 'go' | 'rust';
export type SymbolFilter = SymbolLanguage | 'all';
export type SymbolOccurrence = {
  path: string;
  line: number;
  language: SymbolLanguage;
  matchType: 'definition' | 'reference';
  definitionKind?: string;
  text: string;
};

export function languageForPath(path: string): SymbolLanguage | null {
  if (/\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/i.test(path)) return 'typescript';
  if (/\.go$/i.test(path)) return 'go';
  if (/\.rs$/i.test(path)) return 'rust';
  return null;
}

export function validSymbol(symbol: string): boolean {
  return typeof symbol === 'string' && symbol.length >= 1 && symbol.length <= 80 &&
    /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(symbol);
}

const escapeRegex = (word: string): string =>
  word.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

/** Ignore comments and quoted literals to reduce false references. */
export function scrubSourceLine(line: string, state: { block: boolean; quote: string | null }) {
  let code = '';
  let escaped = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i] ?? '';
    const next = line[i + 1] ?? '';
    if (state.block) {
      if (ch === '*' && next === '/') { state.block = false; code += '  '; i++; }
      else code += ' ';
      continue;
    }
    if (state.quote) {
      code += ' ';
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === state.quote) state.quote = null;
      continue;
    }
    if (ch === '/' && next === '/') { code += ' '.repeat(line.length - i); break; }
    if (ch === '/' && next === '*') { state.block = true; code += '  '; i++; continue; }
    if (ch === '"' || ch === "'" || ch === String.fromCharCode(96)) { state.quote = ch; code += ' '; continue; }
    code += ch;
  }
  // Only multiline template/raw backticks retain quote state.
  if (state.quote !== String.fromCharCode(96)) state.quote = null;
  return code;
}

export function matchesIdentifier(code: string, symbol: string): boolean {
  const escaped = escapeRegex(symbol);
  return new RegExp('(^|[^A-Za-z0-9_$])' + escaped + '(?![A-Za-z0-9_$])').test(code);
}

export function definitionKind(code: string, symbol: string, language: SymbolLanguage): string | null {
  const name = escapeRegex(symbol) + '(?![A-Za-z0-9_$])';
  const patterns: Array<[string, string]> = [];
  if (language === 'typescript') {
    const prefix = '^\\s*(?:(?:export|declare|default|abstract|async)\\s+)*';
    patterns.push(
      ['class', prefix + 'class\\s+' + name],
      ['interface', prefix + 'interface\\s+' + name],
      ['type', prefix + 'type\\s+' + name],
      ['enum', prefix + '(?:const\\s+)?enum\\s+' + name],
      ['namespace', prefix + '(?:namespace|module)\\s+' + name],
      ['function', prefix + 'function\\s*\\*?\\s*' + name + '\\s*(?:<|\\()'],
      ['variable', prefix + '(?:const|let|var)\\s+' + name],
    );
  } else if (language === 'go') {
    patterns.push(
      ['function', '^\\s*func\\s+(?:\\([^)]*\\)\\s*)?' + name + '\\s*(?:\\[|\\()'],
      ['type', '^\\s*type\\s+' + name],
      ['variable', '^\\s*(?:var|const)\\s+' + name],
    );
  } else {
    const prefix = '^\\s*(?:(?:pub(?:\\([^)]*\\))?|async|unsafe|const|extern)\\s+)*';
    patterns.push(
      ['function', prefix + 'fn\\s+' + name + '\\s*(?:<|\\()'],
      ['struct', prefix + 'struct\\s+' + name],
      ['enum', prefix + 'enum\\s+' + name],
      ['trait', prefix + 'trait\\s+' + name],
      ['type', prefix + 'type\\s+' + name],
      ['union', prefix + 'union\\s+' + name],
      ['module', prefix + 'mod\\s+' + name],
      ['constant', prefix + '(?:const|static)\\s+' + name],
      ['macro', '^\\s*macro_rules!\\s*' + name],
    );
  }
  for (const [kind, pattern] of patterns) {
    if (new RegExp(pattern).test(code)) return kind;
  }
  return null;
}

export function scanSymbolSource(path: string, content: string, symbol: string, limit: number) {
  const language = languageForPath(path);
  if (!language || !validSymbol(symbol)) return { definitions: [], references: [] };
  const state = { block: false, quote: null as string | null };
  const definitions: SymbolOccurrence[] = [];
  const references: SymbolOccurrence[] = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const original = lines[i] ?? '';
    const code = scrubSourceLine(original, state);
    if (!matchesIdentifier(code, symbol)) continue;
    const kind = definitionKind(code, symbol, language);
    if (kind) {
      if (definitions.length < limit)
        definitions.push({ path, line: i + 1, language,
          matchType: 'definition', definitionKind: kind, text: original.slice(0, 240) });
    } else if (references.length < limit) {
      references.push({ path, line: i + 1, language,
        matchType: 'reference', text: original.slice(0, 240) });
    }
  }
  return { definitions, references };
}
