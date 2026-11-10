import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Portões das regras de qualidade do AGENTS.md que antes dependiam só de revisão.
 * Se um portão reprovar, corrija o código; não afrouxe a regra para passar.
 */
const files = (dir: string, extension = ".ts"): string[] => readdirSync(dir).flatMap(name => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path, extension)
    : path.endsWith(extension) && !path.endsWith(".d.ts") ? [path.replaceAll("\\", "/")] : [];
});

/** Remove comentários para que a regra olhe só o código (uma menção em JSDoc não é uso). */
export function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}

/** Linhas de código de `paths` que casam com `pattern`, no formato `arquivo:linha: trecho`. */
function offenders(paths: readonly string[], pattern: RegExp): string[] {
  return paths.flatMap(path => stripComments(readFileSync(path, "utf8")).split("\n")
    .flatMap((line, index) => pattern.test(line) ? [`${path}:${index + 1}: ${line.trim()}`] : []));
}

const DETERMINISTIC_ROOTS = ["src/engine", "src/actors", "src/world", "src/render"];
const NONDETERMINISM = /\bMath\.random\b|\bDate\.now\b|\bperformance\.now\b|\bnew Date\s*\(|\bcrypto\.getRandomValues\b/;

test("qualidade: o detector ignora comentários e enxerga o código", () => {
  const sample = "/** sem Math.random aqui */\nconst a = 1; // Date.now() citado\nconst b = Math.random();\n" +
    "const url = \"https://exemplo.dev/Date.now\";";
  const lines = stripComments(sample).split("\n");
  assert.deepEqual(lines.map(line => NONDETERMINISM.test(line)), [false, false, true, true]);
  assert.equal(lines.length, 4, "a numeração das linhas é preservada");
});

test("qualidade: regras, atores, mundo e render não usam acaso global nem relógio de parede", () => {
  assert.deepEqual(offenders(DETERMINISTIC_ROOTS.flatMap(root => files(root)), NONDETERMINISM), [],
    "use hash2/hashString com semente e o dt da simulação");
});

test("qualidade: o TypeScript estrito não foi enfraquecido", () => {
  for (const config of ["tsconfig.json", "server/tsconfig.json"]) {
    const options = (JSON.parse(readFileSync(config, "utf8")) as
      { compilerOptions?: Record<string, unknown> }).compilerOptions ?? {};
    for (const flag of ["strict", "noUncheckedIndexedAccess", "exactOptionalPropertyTypes"])
      assert.equal(options[flag], true, `${config}: ${flag} precisa continuar ligado`);
  }
  const escapes = /@ts-ignore|@ts-nocheck|@ts-expect-error|\bas any\b|:\s*any\b|<any>/;
  const sources = ["src", "server/src"].flatMap(root => files(root));
  // As diretivas @ts-* vivem em comentários: procurar no texto bruto.
  const raw = sources.flatMap(path => readFileSync(path, "utf8").split("\n")
    .flatMap((line, index) => /@ts-(ignore|nocheck|expect-error)/.test(line) ? [`${path}:${index + 1}`] : []));
  assert.deepEqual([...raw, ...offenders(sources, escapes)], [],
    "tipar de verdade em vez de calar o compilador");
});

/** Pulos condicionais legítimos (dependem do ambiente). Qualquer outro precisa entrar aqui, com motivo, e passar por revisão. */
const CONDITIONAL_SKIPS: Readonly<Record<string, string>> = {
  "tests/browser/session.spec.ts": "a orientação paisagem só é coberta no projeto Android",
  "server/tests/database.integration.test.ts": "exige um PostgreSQL real, fornecido só no workflow postgres-market",
};

test("qualidade: nenhum teste está pulado, isolado ou marcado como pendente", () => {
  const suites = [...files("tests").filter(path => !path.endsWith("quality-gates.test.ts")),
    ...files("server/tests"), ...files("server/tests", ".mjs")];
  assert.ok(suites.length > 40);
  const disabled = /\b(test|it|describe)\.(only|skip|todo|fixme)\b|\{\s*(skip|todo|only)\s*:/;
  const found = offenders(suites, disabled);
  assert.deepEqual(found.filter(line => !Object.keys(CONDITIONAL_SKIPS).some(path => line.startsWith(path + ":"))), [],
    "teste que não roda não protege nada: conserte a regra ou o teste");
  for (const path of Object.keys(CONDITIONAL_SKIPS))
    assert.equal(found.filter(line => line.startsWith(path + ":")).length, 1,
      `${path}: a exceção vale para um único pulo condicional; remova a entrada se ele deixou de existir`);
});
