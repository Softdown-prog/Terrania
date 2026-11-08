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

  // Comparative six-region sheet: representative *real* CaveRoom floors, not concept art.
  const caveBundle = await build({
    stdin: { contents: [
      "import { CaveRoom } from './src/engine/CaveRoom.ts';",
      "import { drawCaveView, drawCaveAtlas } from './src/render/cave.ts';",
      "globalThis.CAVES = { CaveRoom, drawCaveView, drawCaveAtlas };",
    ].join("\n"), resolveDir: root, loader: 'ts' },
    bundle: true, format: 'iife', write: false, logLevel: 'error',
  });
  await page.addScriptTag({ content: caveBundle.outputFiles[0].text });
  const caves = await page.evaluate(() => {
    const themes = [
      ['verdant', 'Gruta das Raízes'], ['glacial', 'Gruta das Geadas'],
      ['desert', 'Cripta das Dunas'], ['coastal', 'Caverna das Marés'],
      ['basalt', 'Galeria das Montanhas'], ['marsh', 'Masmorra do Brejo'],
    ];
    const sheet = document.createElement('canvas');
    sheet.width = 1410; sheet.height = 740;
    const ctx = sheet.getContext('2d');
    ctx.fillStyle = '#11211e'; ctx.fillRect(0, 0, sheet.width, sheet.height);
    themes.forEach(([theme,name],i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const bx = col * 470, by = row * 370;
      const room = new globalThis.CAVES.CaveRoom({
        id: 'cave-preview:' + theme, name, theme, kind: 'stairs',
        x: 0, y: 0, tileX: 34 + i, tileY: -78 - i, seed: 842136,
      });
      ctx.save();
      ctx.translate(bx + 16, by + 41);
      ctx.beginPath(); ctx.rect(0, 0, 280, 264); ctx.clip();
      ctx.scale(1.4, 1.4);
      globalThis.CAVES.drawCaveView(ctx, room,
        room.player.x - 100, room.player.y - 94, 200, 189, 1);
      ctx.restore();
      const atlas = document.createElement('canvas');
      atlas.width = 256; atlas.height = 256;
      globalThis.CAVES.drawCaveAtlas(atlas.getContext('2d'), room.floor,
        Math.floor(room.player.x / 32), Math.floor(room.player.y / 32));
      ctx.drawImage(atlas, bx + 299, by + 48, 155, 155);
      ctx.fillStyle = '#fff6dc'; ctx.font = 'bold 17px system-ui';
      ctx.textAlign = 'left'; ctx.fillText(name, bx + 16, by + 29);
      ctx.fillStyle = '#b4c8ba'; ctx.font = '12px system-ui';
      ctx.fillText('Cena 2D', bx + 16, by + 325);
      ctx.fillText('Mapa interno', bx + 300, by + 225);
    });
    return sheet.toDataURL('image/png');
  });
  const caveFile = join(out, 'cavernas-regionais.png');
  writeFileSync(caveFile, Buffer.from(caves.split(',')[1], 'base64'));
  console.log('Comparação real de seis cavernas e seus mapas: ' + caveFile);

  // A second real scene at a wall-facing traversable cell. The previous
  // starter-area preview was almost all floor, so it could not reveal missing
  // wall relief or whether regional formations actually appear in-frame.
  const wallDetails = await page.evaluate(() => {
    const themes = [
      ['verdant', 'Gruta das Raízes'], ['glacial', 'Gruta das Geadas'],
      ['desert', 'Cripta das Dunas'], ['coastal', 'Caverna das Marés'],
      ['basalt', 'Galeria das Montanhas'], ['marsh', 'Masmorra do Brejo'],
    ];
    const sheet = document.createElement('canvas');
    sheet.width = 1410;
    sheet.height = 740;
    const ctx = sheet.getContext('2d');
    ctx.fillStyle = '#10201d';
    ctx.fillRect(0, 0, sheet.width, sheet.height);
    themes.forEach(([theme, name], i) => {
      const column = i % 3, row = Math.floor(i / 3);
      const bx = column * 470, by = row * 370;
      const room = new globalThis.CAVES.CaveRoom({
        id: 'art-wall:' + theme, name, theme, kind: 'stairs',
        x: 0, y: 0, tileX: 34 + i, tileY: -78 - i, seed: 842136,
      });
      let target = null;
      let best = -1;
      for (let y = 4; y < 26; y++) for (let x = 4; x < 38; x++) {
        if (room.floor.at(x, y) !== 1) continue;
        const walls = [[0,-1],[1,0],[0,1],[-1,0]]
          .filter(([dx,dy]) => room.floor.at(x+dx,y+dy) === 0).length;
        if (walls < 1) continue;
        // Prefer a chamber boundary rather than another wide blank patch.
        const score = walls * 10 + Math.min(x, 41-x) / 100;
        if (score > best) { best = score; target = { x, y, walls }; }
      }
      if (!target) throw new Error('Nenhuma parede próxima de piso acessível: ' + theme);
      room.player.x = (target.x + .5) * 32;
      room.player.y = (target.y + .5) * 32;
      ctx.fillStyle = '#fff6dc'; ctx.font = 'bold 16px system-ui';
      ctx.textAlign = 'left'; ctx.fillText(name, bx + 15, by + 28);
      ctx.save();
      ctx.translate(bx + 15, by + 43);
      ctx.beginPath(); ctx.rect(0, 0, 438, 303); ctx.clip();
      ctx.scale(1.36, 1.36);
      globalThis.CAVES.drawCaveView(ctx, room,
        room.player.x - 161, room.player.y - 111.5,
        322, 223, 1);
      ctx.restore();
      ctx.fillStyle = '#b4c8ba'; ctx.font = '10px system-ui';
      ctx.fillText('Parede real: ' + target.walls + ' faces adjacentes · andar -1', bx + 15, by + 361);
    });
    return sheet.toDataURL('image/png');
  });
  const wallFile = join(out, 'cavernas-paredes.png');
  writeFileSync(wallFile, Buffer.from(wallDetails.split(',')[1], 'base64'));
  console.log('Amostra real de paredes e formações nos seis temas: ' + wallFile);

} finally { await browser.close(); }
