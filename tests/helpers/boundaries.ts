import { posix } from "node:path";

/** Nomes das regiões do mundo: pastas com esse nome, em qualquer camada, guardam só o que aparece naquela região. */
export const REGIONS: readonly string[] = ["south", "north", "west", "east", "center"];
/** Subpastas de região que podem ser usadas por irmãs: o kit compartilhado da região (ADR 0045). */
export const SHARED_SUBFOLDERS: readonly string[] = ["kit"];

interface Place { readonly zone: string; readonly region: string; readonly sub: string | null }

/** Onde um caminho (de `src/`) fica: a "zona" (tudo até a pasta da região), a região e a subpasta logo abaixo dela. */
export function placeOf(path: string): Place | null {
  const parts = path.split("/");
  const i = parts.findIndex((p, k) => k > 0 && REGIONS.includes(p));
  if (i < 0) return null;
  const next = parts[i + 1];
  return { zone: parts.slice(0, i).join("/"), region: parts[i]!, sub: next !== undefined && !next.endsWith(".ts") ? next : null };
}

/** Caminhos relativos importados por um arquivo (`from "./x"`, `import("./x")` e `import "./x"`), já resolvidos a partir da pasta dele. */
export function importsOf(path: string, source: string): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(/(?:from|import\(|import)\s*"(\.[^"]+)"/g)) out.push(posix.normalize(posix.join(posix.dirname(path), m[1]!)));
  return out;
}

/**
 * As fronteiras da base de código (ADR 0045):
 * 1. um arquivo de uma região nunca importa outra região, em nenhuma camada (a arte do Sul não lê os dados do Norte);
 * 2. dentro de uma região, uma subpasta nunca importa uma subpasta irmã, a não ser o kit compartilhado;
 * 3. o kit compartilhado nunca importa uma subpasta irmã.
 * Devolve uma linha por violação, "arquivo -> importado: motivo".
 */
export function boundaryViolations(files: ReadonlyMap<string, string>): string[] {
  const out: string[] = [];
  for (const [path, source] of files) {
    const me = placeOf(path);
    if (!me) continue;
    for (const target of importsOf(path, source)) {
      const there = placeOf(target);
      if (!there) continue;
      if (there.region !== me.region) { out.push(`${path} -> ${target}: importa outra região (${me.region} → ${there.region})`); continue; }
      if (there.zone !== me.zone || there.region !== me.region || !me.sub || !there.sub || me.sub === there.sub) continue;
      if (me.sub && SHARED_SUBFOLDERS.includes(me.sub)) out.push(`${path} -> ${target}: o kit compartilhado importa a subpasta irmã "${there.sub}"`);
      else if (!SHARED_SUBFOLDERS.includes(there.sub)) out.push(`${path} -> ${target}: a subpasta "${me.sub}" importa a irmã "${there.sub}" (só o kit é compartilhado)`);
    }
  }
  return out;
}
