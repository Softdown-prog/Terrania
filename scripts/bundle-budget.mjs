// Orçamento de tamanho do download (ADR 0046). Rode depois do build: `npm run bundle:check`.
// Mede os arquivos .js de dist/ (bruto e comprimido) e falha se algum limite for passado.
import { readdirSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const KB = 1024;
/**
 * Medido em 2026-11-12: JS total 2.079 KB (602 KB comprimido) e maior pedaço 1.383 KB, dos quais ~1.168 KB são o Phaser
 * (biblioteca) e ~200 KB são o código do jogo. Cada limite tem ~20 % de folga. Estourar não é erro de código: é a hora de
 * decidir se o peso novo vale a pena (ou se precisa carregar sob demanda) e, se valer, subir o limite com o motivo no ADR.
 */
export const BUDGET = { totalRawKB: 2500, totalGzipKB: 740, largestChunkRawKB: 1700 };

/** Avalia os arquivos medidos contra o orçamento; devolve uma linha por limite. */
export function evaluateBudget(files, budget = BUDGET) {
  const total = files.reduce((n, f) => n + f.raw, 0), totalGzip = files.reduce((n, f) => n + f.gzip, 0);
  const largest = files.reduce((m, f) => Math.max(m, f.raw), 0);
  const rows = [
    { name: "JS total (bruto)", actualKB: total / KB, limitKB: budget.totalRawKB },
    { name: "JS total (comprimido)", actualKB: totalGzip / KB, limitKB: budget.totalGzipKB },
    { name: "maior pedaço de JS (bruto)", actualKB: largest / KB, limitKB: budget.largestChunkRawKB },
  ].map(r => ({ ...r, ok: r.actualKB <= r.limitKB }));
  return { ok: files.length > 0 && rows.every(r => r.ok), rows };
}

/** Mede os .js de uma pasta de build (só a raiz: os pedaços e o principal). */
export function measureDist(dir) {
  return readdirSync(dir).filter(n => n.endsWith(".js")).map(name => {
    const data = readFileSync(join(dir, name));
    return { name, raw: data.length, gzip: gzipSync(data, { level: 9 }).length };
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2] ?? "dist";
  const files = measureDist(dir), result = evaluateBudget(files);
  if (files.length === 0) { console.error(`Nenhum .js em ${dir}: rode "npm run build" antes.`); process.exit(1); }
  for (const r of result.rows) console.log(`${r.ok ? "ok " : "ESTOUROU"}  ${r.name}: ${r.actualKB.toFixed(0)} KB (limite ${r.limitKB} KB)`);
  if (!result.ok) { console.error("Orçamento de tamanho estourado: veja docs/adr/0046-orcamentos-de-custo.md antes de subir o limite."); process.exit(1); }
}
