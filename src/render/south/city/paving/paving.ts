import { TILE_SIZE } from "../../../../world/terrain.ts";
import { CityCurb, NO_EDGES, type PavedEdges } from "./curb.ts";
import { CHIP_LIGHT, GLOW_SHARE, MORTAR, POLISH_FLAT, SLAB_DARK, paveNoise, slabLook } from "./palette.ts";
import { PlazaRings } from "./ring.ts";
import { pavingSlabs } from "./slabs.ts";

/** O que o piso de um tile precisa saber: onde está (canvas e mundo), a semente, a praça e quais lados têm meio-fio. */
export interface PavingInput {
  readonly x: number; readonly y: number;
  readonly tx: number; readonly ty: number;
  readonly seed: number;
  readonly plaza: boolean;
  readonly edges?: PavedEdges;
}

/**
 * Piso de pedra da cidade do Poço Negro (ADR 0042): lajes de largura e tom variados em fiadas deslocadas, com junta
 * escura, quina clara a noroeste, rachaduras e areia nas juntas. Na praça, a pedra sobre os anéis em volta do poço
 * é bronze; nas bordas que encostam na areia há meio-fio. Pinta o tile inteiro (32 × 32 px a partir de x, y).
 */
export function paintCityPaving(ctx: CanvasRenderingContext2D, input: PavingInput): void {
  const { x, y, tx, ty, seed, plaza } = input, edges = input.edges ?? NO_EDGES;
  ctx.fillStyle = MORTAR; ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  const slabs = pavingSlabs(tx, ty, seed);
  for (const slab of slabs) {
    const sx = x + slab.x + (slab.left ? 0.6 : 0), sy = y + slab.y + (slab.top ? 0.6 : 0);
    const sw = slab.w - (slab.left ? 0.6 : 0) - (slab.right ? 0.6 : 0), sh = slab.h - (slab.top ? 0.6 : 0) - (slab.bottom ? 0.6 : 0);
    // volume com três retângulos empilhados: a sombra (laje inteira), a luz (menos a coluna e a linha de sombra) e o corpo
    const look = slabLook(slab.tone, slab.roll), hasLight = slab.top || slab.left, hasDark = slab.right || slab.bottom;
    if (hasDark) { ctx.fillStyle = look.dark; ctx.fillRect(sx, sy, sw, sh); }
    if (hasLight) { ctx.fillStyle = look.light; ctx.fillRect(sx, sy, sw - (slab.right ? 1 : 0), sh - (slab.bottom ? 1 : 0)); }
    ctx.fillStyle = look.body;
    ctx.fillRect(sx + (slab.left ? 1 : 0), sy + (slab.top ? 1 : 0), sw - (slab.left ? 1 : 0) - (slab.right ? 1 : 0), sh - (slab.top ? 1 : 0) - (slab.bottom ? 1 : 0));
    // rachadura em algumas lajes (curva que corre de uma borda a outra)
    if (slab.roll > 0.84 && slab.w > 9) {
      ctx.beginPath(); ctx.moveTo(sx + 1, sy + 2 + slab.roll * 3);
      ctx.quadraticCurveTo(sx + sw * 0.5, sy + sh * (0.3 + slab.roll * 0.4), sx + sw - 1, sy + sh - 2 - slab.roll * 2);
      ctx.strokeStyle = SLAB_DARK; ctx.lineWidth = 0.8; ctx.stroke();
    }
    // lajes polidas pelo uso: um brilho suave no meio, que some nas bordas
    if (slab.roll >= 0.12 && slab.roll < 0.4 && sw > 8) {
      ctx.fillStyle = POLISH_FLAT; ctx.fillRect(sx + 1, sy + 1, sw - 2, sh - 2);
    }
    // quina de baixo arredondada pelo desgaste, em algumas lajes inteiras
    if (slab.roll > 0.5 && slab.roll < 0.75 && slab.right && sw > 6) {
      ctx.beginPath(); ctx.arc(sx + sw - 2.2, sy + sh - 2.2, 2, 0, Math.PI / 2);
      ctx.strokeStyle = SLAB_DARK; ctx.lineWidth = 0.9; ctx.stroke();
    }
    // lasca clara na quina de baixo das lajes mais gastas
    if (slab.roll < 0.12) { ctx.fillStyle = CHIP_LIGHT; ctx.fillRect(sx + sw * 0.5, sy + 2, 2.2, 1); }
  }
  // uma laje de destaque por tile (escolhida pelo sorteio): polida pelo uso, rachada em duas curvas e com a quina gasta
  const wide = slabs.filter(slab => slab.w >= 8 && slab.left && slab.right);
  const feature = wide[Math.floor(paveNoise(tx, ty, seed + 79) * wide.length)];
  if (feature) {
    const fx = x + feature.x, fy = y + feature.y, cx = fx + feature.w / 2, cy = fy + feature.h / 2;
    if (paveNoise(tx, ty, seed + 83) < GLOW_SHARE) {
      // só uma em cada três lajes de destaque tem o degradê de polimento (um degradê por tile custa caro num chunk inteiro)
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, feature.w * 0.6);
      glow.addColorStop(0, "rgba(255,246,220,0.22)"); glow.addColorStop(1, "rgba(255,246,220,0)");
      ctx.fillStyle = glow; ctx.fillRect(fx, fy, feature.w, feature.h);
    } else { ctx.fillStyle = POLISH_FLAT; ctx.fillRect(fx + 1, fy + 1, feature.w - 2, feature.h - 2); }
    ctx.beginPath(); ctx.moveTo(fx + 1.5, fy + 2);
    ctx.quadraticCurveTo(fx + feature.w * 0.3, fy + feature.h * 0.7, fx + feature.w * 0.55, fy + feature.h * 0.45);
    ctx.quadraticCurveTo(fx + feature.w * 0.8, fy + feature.h * 0.2, fx + feature.w - 1.5, fy + feature.h - 2);
    ctx.strokeStyle = SLAB_DARK; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.beginPath(); ctx.arc(fx + feature.w - 2.6, fy + feature.h - 2.6, 2, 0, Math.PI / 2);
    ctx.strokeStyle = SLAB_DARK; ctx.lineWidth = 0.9; ctx.stroke();
  }
  // mancha de sujeira e óleo de séculos de pés e carroças: uma por tile, em lugar fixo pelo sorteio
  const sx = x + 5 + paveNoise(tx, ty, seed + 71) * 22, sy = y + 5 + paveNoise(tx, ty, seed + 73) * 22;
  ctx.fillStyle = "rgba(38,28,50,0.22)"; ctx.beginPath(); ctx.ellipse(sx, sy, 4 + paveNoise(tx, ty, seed + 75) * 4, 2 + paveNoise(tx, ty, seed + 77) * 2, 0, 0, Math.PI * 2); ctx.fill();
  // areia que o vento deixou nas juntas
  for (let i = 0; i < 2; i++) {
    const r = paveNoise(tx * 2 + i, ty, seed + 67);
    if (r < 0.5) continue;
    ctx.fillStyle = "rgba(201,164,104,0.55)"; ctx.beginPath();
    ctx.ellipse(x + 4 + r * 24, y + (i ? 10.67 : 21.33), 2.6, 0.9, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (plaza && PlazaRings.touches(tx, ty)) new PlazaRings(ctx).paint(x, y, tx, ty);
  if (edges.n || edges.e || edges.s || edges.w) new CityCurb(ctx).stones(x, y, tx, ty, edges, seed);
}
