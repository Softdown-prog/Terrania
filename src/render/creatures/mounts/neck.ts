/**
 * Pescoço e crina das montarias (ADR 0091): o pescoço é um volume afilado entre a cernelha e a nuca (com a curva que cada espécie quiser), não duas elipses; a crina
 * é um punhado de fios que nascem na linha da nuca e acompanham o vento.
 */
import type { Palette } from "./geometry.ts";
import { EDGE, GLINT } from "./geometry.ts";
import { rgba, shade } from "../../draw.ts";

export interface NeckSpec {
  /** A base (na cernelha, dentro do tronco) e a nuca (onde a cabeça encaixa), com a largura em cada ponta. */
  readonly baseX: number; readonly baseY: number; readonly baseWidth: number;
  readonly topX: number; readonly topY: number; readonly topWidth: number;
  /** O quanto o pescoço arqueia para cima (positivo) ou cai (negativo), em unidades. */
  readonly arch: number;
}

/** O ponto da linha de cima do pescoço em `t` (0 na cernelha, 1 na nuca): serve para pôr a crina e as orelhas. */
export function neckTop(n: NeckSpec, t: number): readonly [number, number] {
  const x = n.baseX + (n.topX - n.baseX) * t, y = n.baseY + (n.topY - n.baseY) * t - Math.sin(t * Math.PI) * n.arch;
  return [x - n.baseWidth * (1 - t) * .15, y - (n.baseWidth * (1 - t) + n.topWidth * t) * .5];
}

/** Traça uma linha suave pelos pontos (curvas entre os pontos médios), a partir do ponto atual do caminho. */
function smooth(ctx: CanvasRenderingContext2D, pts: ReadonlyArray<readonly [number, number]>): void {
  for (let i = 1; i < pts.length - 1; i++) { const [x, y] = pts[i]!, [nx, ny] = pts[i + 1]!; ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2); }
  const last = pts[pts.length - 1]!; ctx.lineTo(last[0], last[1]);
}

export function drawNeck(ctx: CanvasRenderingContext2D, p: Palette, n: NeckSpec): void {
  const side = (t: number, sign: 1 | -1): readonly [number, number] => {
    const x = n.baseX + (n.topX - n.baseX) * t, y = n.baseY + (n.topY - n.baseY) * t - Math.sin(t * Math.PI) * n.arch, w = (n.baseWidth * (1 - t) + n.topWidth * t) * .5;
    return [x + sign * w * .55, y + sign * w * .9];
  };
  const upper: Array<readonly [number, number]> = [], lower: Array<readonly [number, number]> = [];
  for (let i = 0; i <= 8; i++) { upper.push(side(i / 8, -1)); lower.push(side(i / 8, 1)); }
  const g = ctx.createLinearGradient(n.baseX, n.baseY - n.baseWidth, n.topX, n.topY + n.topWidth);
  g.addColorStop(0, p.light); g.addColorStop(.45, p.base); g.addColorStop(1, shade(p.dark, .1));
  ctx.beginPath(); ctx.moveTo(upper[0]![0], upper[0]![1]);
  smooth(ctx, upper);
  const back = [...lower].reverse(); ctx.lineTo(back[0]![0], back[0]![1]); smooth(ctx, back);
  ctx.closePath(); ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = EDGE; ctx.lineWidth = 1.4; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(upper[0]![0], upper[0]![1]); smooth(ctx, upper); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(lower[0]![0], lower[0]![1]); smooth(ctx, lower); ctx.stroke();
  ctx.strokeStyle = rgba(GLINT, .4); ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(upper[1]![0] + .5, upper[1]![1] + 1.4); smooth(ctx, upper.slice(1, 7).map(([x, y]) => [x + .5, y + 1.4] as const)); ctx.stroke();
}

/** A crina: fios curtos e longos alternados que nascem na linha de cima do pescoço, caem para trás e balançam com o tempo. */
export function drawMane(ctx: CanvasRenderingContext2D, p: Palette, n: NeckSpec, time: number, strands = 16, length = 9): void {
  for (let i = 0; i < strands; i++) {
    const t = i / (strands - 1), [x, y] = neckTop(n, t), sway = Math.sin(time * 2.1 + i * .55) * 1.3, len = length * (.7 + (i % 3) * .2);
    ctx.strokeStyle = EDGE; ctx.lineWidth = 2.6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - len * .35 + sway * .5, y - 1.5, x - len * .8 + sway, y + len * .45); ctx.stroke();
    ctx.strokeStyle = i % 3 ? p.dark : shade(p.dark, .3); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - len * .35 + sway * .5, y - 1.5, x - len * .8 + sway, y + len * .45); ctx.stroke();
  }
  ctx.lineCap = "butt";
}
