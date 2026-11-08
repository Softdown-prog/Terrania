// Fotografa todas as peças registradas em tests/helpers/artAssets.ts, ampliadas, sobre o fundo do jogo.
// Uso: npm run art:preview [pasta-de-saída]   (padrão: test-results/art-preview)
// Opcional: CHROMIUM_PATH=/caminho/do/chromium se o navegador do Playwright não estiver instalado.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.argv[2] ?? join(root, 'test-results/art-preview'));
mkdirSync(out, { recursive: true });

const bundle = await build({
  stdin: { contents: `import { ASSETS } from './tests/helpers/artAssets.ts'; globalThis.ART = ASSETS;`, resolveDir: root, loader: 'ts' },
  bundle: true, format: 'iife', write: false, logLevel: 'error',
});
const scale = { character: 4, creature: 4, prop: 4, structure: 1.5 };
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] } : {});
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
  await page.setContent('<body style="margin:0;background:#4e8a55"></body>');
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const sheet = await page.evaluate(scales => {
    const assets = globalThis.ART, cell = { w: 230, h: 300 }, cols = 6;
    const canvas = document.createElement('canvas');
    canvas.width = cols * cell.w; canvas.height = Math.ceil(assets.length / cols) * cell.h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#4e8a55'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    assets.forEach((asset, i) => {
      const x = (i % cols) * cell.w + cell.w / 2, y = Math.floor(i / cols) * cell.h + cell.h - 34;
      ctx.save(); ctx.translate(x, y); ctx.scale(scales[asset.tier], scales[asset.tier]);
      try { asset.draw(ctx); } catch (error) { ctx.restore(); ctx.fillStyle = '#fff'; ctx.fillText('ERRO ' + error.message, -60, 0); ctx.save(); }
      ctx.restore();
      ctx.fillStyle = '#10201e'; ctx.font = '12px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(asset.id + ' · ' + asset.tier, x, Math.floor(i / cols) * cell.h + cell.h - 10);
    });
    return canvas.toDataURL('image/png');
  }, scale);
  const file = join(out, 'pecas.png');
  writeFileSync(file, Buffer.from(sheet.split(',')[1], 'base64'));
  console.log('Capturas das peças registradas: ' + file);
} finally { await browser.close(); }
