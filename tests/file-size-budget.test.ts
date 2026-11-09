import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Teto de tamanho dos arquivos TypeScript. O objetivo é que dar manutenção em um arquivo
 * não exija ler o projeto inteiro: um arquivo que cresce além do limite deve ser dividido
 * por responsabilidade (ver docs/adr/0013-decomposicao-do-game.md), não receber mais código.
 *
 * - Arquivo novo: no máximo DEFAULT_LIMIT linhas.
 * - Arquivo já grande: listado abaixo com o teto atual. O teto só pode DESCER: crescer reprova.
 * - Ao dividir um arquivo grande, baixe (ou remova) a linha dele aqui, para travar o ganho.
 */
const DEFAULT_LIMIT = 400;
export const LARGE_FILES: Readonly<Record<string, number>> = {
  "src/render/actors.ts": 590,
  "src/game/Game.ts": 510,
  "src/render/terrain.ts": 479,
  "src/render/regionalWave3.ts": 471,
  "src/render/scenery.ts": 465,
};
const ROOTS = ["src", "server/src"];

const files = (dir: string): string[] => readdirSync(dir).flatMap(name => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path) : path.endsWith(".ts") && !path.endsWith(".d.ts") ? [path] : [];
});
const lineCount = (path: string): number => readFileSync(path, "utf8").replace(/\n$/, "").split("\n").length;
const sources = ROOTS.flatMap(files).map(path => path.replaceAll("\\", "/"));

test("tamanho: nenhum arquivo novo passa do limite e os grandes não crescem", () => {
  const over = sources.flatMap(path => {
    const limit = LARGE_FILES[path] ?? DEFAULT_LIMIT, lines = lineCount(path);
    return lines > limit ? [`${path}: ${lines} linhas (limite ${limit}${path in LARGE_FILES ? ", teto do arquivo já grande" : ""})`] : [];
  });
  assert.deepEqual(over, [], "divida o arquivo por responsabilidade em vez de acrescentar código a ele");
});

test("tamanho: a lista de arquivos grandes não guarda entradas obsoletas", () => {
  const stale = Object.keys(LARGE_FILES).flatMap(path => {
    if (!sources.includes(path)) return [`${path}: o arquivo não existe mais; remova a linha`];
    return lineCount(path) <= DEFAULT_LIMIT ? [`${path}: já cabe em ${DEFAULT_LIMIT} linhas; remova a linha`] : [];
  });
  assert.deepEqual(stale, []);
});

test("tamanho: o teto de um arquivo grande acompanha o ganho (não fica folgado)", () => {
  const loose = Object.entries(LARGE_FILES).flatMap(([path, cap]) => {
    const lines = sources.includes(path) ? lineCount(path) : cap;
    return cap - lines > 40 ? [`${path}: tem ${lines} linhas mas o teto é ${cap}; baixe o teto para travar o ganho`] : [];
  });
  assert.deepEqual(loose, []);
});
