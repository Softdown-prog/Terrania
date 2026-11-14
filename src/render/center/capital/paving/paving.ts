import { TILE_SIZE } from "../../../../world/terrain.ts";
import { CapitalCurb, NO_EDGES, type PavedEdges } from "./curb.ts";
import { GLOW_SHARE, MORTAR, STONE_DARK, paveNoise, stoneLook, type PavingKind } from "./palette.ts";
import { PlazaSun } from "./sun.ts";
import { capitalSetts } from "./setts.ts";

/** O que o piso de um tile precisa saber: onde está (canvas e mundo), a semente, se é da praça e quais lados têm meio-fio. */
export interface PavingInput {
  readonly x: number; readonly y: number;
  readonly tx: number; readonly ty: number;
  readonly seed: number;
  readonly plaza: boolean;
  readonly edges?: PavedEdges;
}

/**
 * Piso da capital (ADR 0057): pedras de granito em fiadas deslocadas nas ruas e lajes de calcário na praça, com junta escura,
 * fio de luz a noroeste e de sombra a sudeste, e, na praça, a rosa dos ventos de pedra incrustada em volta do monumento. Nas bordas
 * que encostam no gramado há meio-fio de calcário. Pinta o tile inteiro (32 × 32 px a partir de x, y).
 */
export function paintCapitalPaving(ctx: CanvasRenderingContext2D, input: PavingInput): void {
  const { x, y, tx, ty, seed, plaza } = input, edges = input.edges ?? NO_EDGES, kind: PavingKind = plaza ? "plaza" : "street";
  ctx.fillStyle = MORTAR[kind]; ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  const setts = capitalSetts(tx, ty, seed, plaza);
  for (const s of setts) {
    const look = stoneLook(kind, s.tone, s.roll), sx = x + s.x, sy = y + s.y;
    // volume com três retângulos empilhados: a sombra (pedra inteira), a luz (menos a coluna e a linha de sombra) e o corpo
    if (s.right || s.bottom) { ctx.fillStyle = look.dark; ctx.fillRect(sx, sy, s.w, s.h); }
    ctx.fillStyle = look.light; ctx.fillRect(sx, sy, s.w - (s.right ? 1 : 0), s.h - 1);
    ctx.fillStyle = look.body;
    ctx.fillRect(sx + (s.left ? 1 : 0), sy + 1, s.w - (s.left ? 1 : 0) - (s.right ? 1 : 0), s.h - 2);
    // rachadura em algumas pedras (curva que corre de uma borda a outra)
    if (s.roll > 0.86 && s.w > 9) {
      ctx.beginPath(); ctx.moveTo(sx + 1, sy + 1.5 + s.roll * 2);
      ctx.quadraticCurveTo(sx + s.w * 0.5, sy + s.h * (0.3 + s.roll * 0.3), sx + s.w - 1, sy + s.h - 1.5);
      ctx.strokeStyle = STONE_DARK[kind]; ctx.lineWidth = 0.8; ctx.stroke();
    }
    // quina de baixo arredondada pelo desgaste, em algumas pedras inteiras
    if (s.roll > 0.5 && s.roll < 0.62 && s.right && s.w > 6) {
      ctx.beginPath(); ctx.arc(sx + s.w - 2, sy + s.h - 2, 1.5, 0, Math.PI / 2);
      ctx.strokeStyle = STONE_DARK[kind]; ctx.lineWidth = 0.9; ctx.stroke();
    }
  }
  // uma pedra de destaque por tile (pelo sorteio): em uma de cada três, polida pelo uso, com um brilho suave que some nas bordas
  const full = setts.filter(s => s.left && s.right && s.w >= 12);
  const feature = full[Math.floor(paveNoise(tx, ty, seed + 79) * full.length)];
  if (feature && paveNoise(tx, ty, seed + 83) < GLOW_SHARE) {
    const fx = x + feature.x, fy = y + feature.y, cx = fx + feature.w / 2, cy = fy + feature.h / 2;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, feature.w * 0.62);
    glow.addColorStop(0, "rgba(255,246,220,0.24)"); glow.addColorStop(1, "rgba(255,246,220,0)");
    ctx.fillStyle = glow; ctx.fillRect(fx, fy, feature.w, feature.h);
  }
  if (plaza) new PlazaSun(ctx).draw(x, y, tx, ty);
  new CapitalCurb(ctx).draw(x, y, edges);
}
