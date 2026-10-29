import { CHUNK_PIXELS, CHUNK_TILES, getTile, TILE_SIZE, type Tile } from '../world/terrain.ts';
import { hash2 } from '../world/random.ts';
function drawTile(ctx: CanvasRenderingContext2D, tile: Tile, x: number, y: number, tx: number, ty: number, seed: number): void {
  const colors = { grass: '#6eae70', forest: '#508958', path: '#aa8a61', sand: '#c9b481', water: '#3e91a6' };
  ctx.fillStyle = colors[tile.ground]; ctx.fillRect(x, y, TILE_SIZE + .5, TILE_SIZE + .5);
  const rnd = hash2(tx, ty, seed + 313);
  if (tile.ground === 'water') {
    ctx.fillStyle = rnd > .5 ? '#63b6c0' : '#2a8299';
    ctx.fillRect(x + 6 + rnd * 12, y + 11, 11, 2);
    ctx.fillRect(x + 2 + rnd * 14, y + 25, 7, 1);
  } else {
    ctx.fillStyle = tile.ground === 'sand' ? '#aa976e' : tile.ground === 'path' ? '#876d4c' : '#a1cb78';
    ctx.fillRect(x + rnd * 21, y + 6, 3, 2);
    if (tile.ground === 'grass' || tile.ground === 'forest') {
      ctx.strokeStyle = '#356f48'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 22, y + 18); ctx.lineTo(x + 20, y + 13); ctx.moveTo(x + 22, y + 18); ctx.lineTo(x + 25, y + 15); ctx.stroke();
    }
  }
  if (tile.rock) {
    ctx.fillStyle = '#3d5750'; ctx.beginPath(); ctx.ellipse(x + 17, y + 22, 12, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9ba99d'; ctx.beginPath(); ctx.moveTo(x + 7, y + 18);ctx.lineTo(x + 13, y + 9);ctx.lineTo(x + 22, y + 12);ctx.lineTo(x + 27, y + 21);ctx.closePath();ctx.fill();
  }
  if (tile.tree) {
    ctx.fillStyle = '#29422b88';ctx.beginPath();ctx.ellipse(x + 19, y + 27, 14, 6, 0, 0, Math.PI * 2);ctx.fill();
    ctx.fillStyle = '#694b36';ctx.fillRect(x + 14, y + 14, 7, 13);
    ctx.fillStyle = '#2d653b';ctx.beginPath();ctx.arc(x + 13, y + 12, 11, 0, Math.PI * 2);ctx.arc(x + 22, y + 12, 9, 0, Math.PI * 2);ctx.arc(x + 17, y + 6, 12, 0, Math.PI * 2);ctx.fill();
    ctx.fillStyle = '#61a653';ctx.beginPath();ctx.arc(x + 13, y + 7, 8, 0, Math.PI * 2);ctx.fill();
  }
}
/** Renderiza uma vez o terreno do chunk em Canvas auxiliar: nenhum arquivo de imagem. */
export function generateChunkCanvas(cx: number, cy: number, seed: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = CHUNK_PIXELS; canvas.height = CHUNK_PIXELS;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponível.');
  for (let y = 0; y < CHUNK_TILES; y++) for (let x = 0; x < CHUNK_TILES; x++) {
    const tx = cx * CHUNK_TILES + x, ty = cy * CHUNK_TILES + y;
    drawTile(ctx, getTile(tx, ty, seed), x * TILE_SIZE, y * TILE_SIZE, tx, ty, seed);
  }
  return canvas;
}
