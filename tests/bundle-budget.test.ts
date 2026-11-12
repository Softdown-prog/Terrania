import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BUDGET, evaluateBudget, measureDist } from "../scripts/bundle-budget.mjs";

/**
 * Orçamento de tamanho do download (ADR 0046): a lógica que decide se o build passou do limite. O build de verdade é
 * conferido em `npm run bundle:check`, depois de `npm run build`, no CI.
 */
const KB = 1024;
const file = (name: string, rawKB: number, gzipKB: number) => ({ name, raw: rawKB * KB, gzip: gzipKB * KB });

test("um build dentro do orçamento passa, com uma linha por limite", () => {
  const result = evaluateBudget([file("main.js", 240, 75), file("chunk-game.js", 1380, 390), file("chunk-b.js", 400, 130)]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.rows.map(r => r.name), ["JS total (bruto)", "JS total (comprimido)", "maior pedaço de JS (bruto)"]);
  assert.ok(result.rows.every(r => r.ok));
  assert.ok(Math.abs(result.rows[0]!.actualKB - 2020) < 1e-9 && Math.abs(result.rows[2]!.actualKB - 1380) < 1e-9);
});

test("cada um dos três limites reprova sozinho", () => {
  const base = [file("a.js", 1000, 300), file("b.js", 800, 200)];
  assert.equal(evaluateBudget([...base, file("c.js", 800, 10)]).rows[0]!.ok, false, "total bruto");
  assert.equal(evaluateBudget([...base, file("c.js", 10, 300)]).rows[1]!.ok, false, "total comprimido");
  assert.equal(evaluateBudget([file("big.js", 1800, 100)]).rows[2]!.ok, false, "maior pedaço");
  assert.equal(evaluateBudget([file("big.js", 1800, 100)]).ok, false);
  const exact = evaluateBudget([file("x.js", BUDGET.largestChunkRawKB, 100)]);
  assert.equal(exact.rows[2]!.ok, true, "exatamente no limite ainda passa");
  assert.equal(evaluateBudget([file("x.js", BUDGET.largestChunkRawKB + 1, 100)]).rows[2]!.ok, false, "um KB acima reprova");
});

test("sem nenhum arquivo medido o orçamento não passa (build ausente não vale como aprovado)", () => {
  assert.equal(evaluateBudget([]).ok, false);
});

test("os limites aceitam um orçamento próprio", () => {
  assert.equal(evaluateBudget([file("a.js", 100, 50)], { totalRawKB: 90, totalGzipKB: 100, largestChunkRawKB: 100 }).ok, false);
  assert.equal(evaluateBudget([file("a.js", 100, 50)], { totalRawKB: 110, totalGzipKB: 60, largestChunkRawKB: 100 }).ok, true);
});

test("o orçamento tem a folga combinada sobre o medido e o maior pedaço cabe no total", () => {
  assert.ok(BUDGET.totalRawKB > BUDGET.largestChunkRawKB, "o total é maior que o maior pedaço");
  assert.ok(BUDGET.totalGzipKB < BUDGET.totalRawKB / 2.5, "comprimido bem menor que o bruto");
  // Medido em 2026-11-12: 2.079 KB brutos, 605 KB comprimidos, maior pedaço 1.383 KB.
  assert.ok(BUDGET.totalRawKB / 2079 < 1.35 && BUDGET.totalRawKB / 2079 > 1.05, "folga de 5 % a 35 % no total bruto");
  assert.ok(BUDGET.totalGzipKB / 605 < 1.35 && BUDGET.totalGzipKB / 605 > 1.05, "folga de 5 % a 35 % no comprimido");
  assert.ok(BUDGET.largestChunkRawKB / 1383 < 1.35 && BUDGET.largestChunkRawKB / 1383 > 1.05, "folga de 5 % a 35 % no maior pedaço");
});

test("a medição lê só os .js da raiz da pasta e comprime de verdade", () => {
  const dir = mkdtempSync(join(tmpdir(), "terrania-bundle-"));
  try {
    writeFileSync(join(dir, "main-X.js"), "a".repeat(10_000));
    writeFileSync(join(dir, "chunk-Y.js"), Array.from({ length: 2000 }, (_, i) => `var v${i}=${i * 7919 % 1000};`).join(""));
    writeFileSync(join(dir, "styles.css"), "b".repeat(5_000));
    writeFileSync(join(dir, "index.html"), "<html></html>");
    const files = measureDist(dir).sort((a, b) => a.name.localeCompare(b.name));
    assert.deepEqual(files.map(f => f.name), ["chunk-Y.js", "main-X.js"]);
    assert.equal(files[1]!.raw, 10_000);
    assert.ok(files[1]!.gzip < 100, "dez mil letras iguais comprimem muito: " + files[1]!.gzip);
    assert.ok(files[0]!.gzip < files[0]!.raw && files[0]!.gzip > 1000, "o outro comprime, mas não a nada");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
