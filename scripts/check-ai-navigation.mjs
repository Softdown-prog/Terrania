import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const indexes = tracked.filter(path => /(^|\/)(AGENTS|INDEX)\.md$/.test(path) ||
  ['docs/AI_NAVIGATION.md', 'GEMINI.md', '.github/copilot-instructions.md'].includes(path));
let checked = 0;
const failures = [];
for (const path of indexes) {
  const content = readFileSync(resolve(root, path), 'utf8');
  for (const match of content.matchAll(/\[[^\]\n]*\]\(([^)\n]+)\)/g)) {
    const raw = match[1]?.split(/\s+"/, 1)[0]?.trim() ?? '';
    if (!raw || raw.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(raw)) continue;
    const clean = decodeURIComponent(raw.split('#')[0] ?? '');
    const target = resolve(root, dirname(path), clean);
    const rel = relative(root, target);
    checked++;
    if (isAbsolute(rel) || rel === '..' || rel.startsWith('..' + sep) || !existsSync(target))
      failures.push(`${path} -> ${raw}`);
  }
}
if (failures.length) {
  console.error(`Índices de IA: ${failures.length} link(s) inválido(s):\n${failures.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Índices de IA: ${indexes.length} documento(s), ${checked} link(s) verificados.`);
}
