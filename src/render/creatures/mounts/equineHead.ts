/**
 * A cabeça de cavalo, comum ao cavalo de guerra e ao unicórnio (ADR 0091): crânio, focinho comprido e queixo como uma peça só com gradiente, orelhas, olho com
 * pálpebra, narina, boca, e o freio de couro. O unicórnio acrescenta o chifre por cima. `x, y` é a nuca; a cabeça aponta para +x e para baixo.
 */
import type { Palette } from "./geometry.ts";
import { EDGE, GLINT } from "./geometry.ts";
import { ellipse, rgba, shade } from "../../draw.ts";

export interface EquineHeadOptions { readonly x: number; readonly y: number; readonly time: number; readonly scale?: number; readonly bridle?: boolean }

export function drawEquineHead(ctx: CanvasRenderingContext2D, p: Palette, o: EquineHeadOptions): void {
  const s = o.scale ?? 1;
  ctx.save(); ctx.translate(o.x, o.y); ctx.scale(s, s);
  // orelhas: duas pontas, a de trás mais escura, com o miolo claro; mexem com o tempo
  for (const [dx, tilt, shadeK] of [[-3.5, -.18, -.25], [0, .1, 0]] as const) {
    const flick = Math.sin(o.time * 2.1 + dx) * .06;
    ctx.save(); ctx.translate(dx - 1, -1); ctx.rotate(tilt + flick);
    ctx.beginPath(); ctx.moveTo(-2.4, 0); ctx.quadraticCurveTo(-2.8, -7, .4, -10.5); ctx.quadraticCurveTo(3.2, -6, 2.6, 0); ctx.closePath();
    ctx.fillStyle = shade(p.base, shadeK); ctx.fill(); ctx.strokeStyle = EDGE; ctx.lineWidth = 1.1; ctx.stroke();
    ctx.fillStyle = rgba(p.accent, .6); ctx.beginPath(); ctx.moveTo(-1, -1.5); ctx.quadraticCurveTo(-1.2, -6, .4, -8); ctx.quadraticCurveTo(1.6, -5.5, 1.2, -1.5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // o crânio e o focinho: um só contorno, da nuca à ponta do nariz, descendo até o queixo
  const head = ctx.createLinearGradient(-4, -3, 16, 16);
  head.addColorStop(0, p.light); head.addColorStop(.45, p.base); head.addColorStop(1, shade(p.dark, .12));
  ctx.beginPath();
  ctx.moveTo(-5, -1); ctx.bezierCurveTo(1, -4, 8, -2, 17, 8);          // testa e nariz
  ctx.bezierCurveTo(20.5, 11, 20.5, 15.5, 16, 16.5);                      // focinho
  ctx.bezierCurveTo(11, 17.5, 8, 15, 4, 11);                              // queixo e mandíbula
  ctx.bezierCurveTo(-1, 13, -6, 9, -5, -1); ctx.closePath();
  ctx.fillStyle = head; ctx.fill(); ctx.strokeStyle = EDGE; ctx.lineWidth = 1.4; ctx.lineJoin = "round"; ctx.stroke();
  // bochecha: sombra sob o osso do rosto e brilho no alto do nariz
  const cheek = ctx.createRadialGradient(1, 6, 1, 1, 6, 8); cheek.addColorStop(0, rgba(p.dark, .0)); cheek.addColorStop(1, rgba(p.dark, .35));
  ctx.fillStyle = cheek; ctx.beginPath(); ctx.ellipse(1.5, 6.5, 7, 6, .2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = rgba(GLINT, .55); ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(-1, -1.6); ctx.bezierCurveTo(4, -2.2, 9, -.2, 15, 7); ctx.stroke();
  ellipse(ctx, 15.4, 11.2, 3.2, 3.3, shade(p.light, -.05));
  ellipse(ctx, 17.6, 10.2, 1.5, 1, shade(p.dark, -.4));
  ctx.strokeStyle = shade(p.dark, -.2); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(10, 15.6); ctx.quadraticCurveTo(14, 15.4, 17.5, 14.4); ctx.stroke();
  // olho com pálpebra e brilho
  const blink = Math.sin(o.time * .7) > .985;
  if (blink) { ctx.strokeStyle = EDGE; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(1.4, 3.6); ctx.lineTo(5.6, 3.6); ctx.stroke(); }
  else { ellipse(ctx, 3.6, 3.6, 2.8, 2.4, EDGE); ellipse(ctx, 3.5, 3.5, 2, 1.7, p.accent); ellipse(ctx, 3.5, 3.5, .9, 1.2, EDGE); ellipse(ctx, 3, 2.8, .55, .5, GLINT);
    ctx.strokeStyle = shade(p.dark, -.3); ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(.8, 2.4); ctx.quadraticCurveTo(3.6, 1.1, 6.4, 2.6); ctx.stroke(); }
  if (o.bridle !== false) {
    ctx.strokeStyle = EDGE; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(9, 9.5); ctx.lineTo(10, 15.6); ctx.stroke();
    ctx.strokeStyle = p.tack; ctx.lineWidth = 1.9; ctx.stroke();
    ellipse(ctx, 6, 5.6, 1.5, 1.5, "#d6bb82"); ellipse(ctx, 5.7, 5.2, .5, .5, GLINT);
  }
  ctx.restore();
}
