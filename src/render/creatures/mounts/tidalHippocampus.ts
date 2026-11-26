/**
 * Hipocampo das Marés — pescoço equino de peixe, corpo escamado que termina numa cauda de cavalo-marinho enrolada, nadadeiras em leque, guelras, crina de espinhos e
 * bolhas (ADR 0091). Não tem pernas: flutua. A sela é a comum, no dorso.
 */
import type { Palette } from "./geometry.ts";
import { EDGE, GLINT } from "./geometry.ts";
import { drawMane, drawNeck, type NeckSpec } from "./neck.ts";
import { drawSaddle } from "./saddle.ts";
import type { TorsoSpec } from "../shared/anatomy/torso.ts";
import { ellipse, rgba, shade, TAU } from "../../draw.ts";

/** Só as medidas que a sela usa: o dorso a −34 (a mesma altura de sempre para o cavaleiro) e a barriga logo abaixo. */
export const TIDAL_HIPPOCAMPUS_TORSO: TorsoSpec = { front: 21, rear: -22, withers: -34, back: -34, croup: -33, bellyFront: -14, bellyRear: -16, shoulderX: 7, haunchX: -9, muscle: 8 };
const NECK: NeckSpec = { baseX: 15, baseY: -30, baseWidth: 17, topX: 25, topY: -52, topWidth: 8.5, arch: 4 };

function bodyPath(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath(); ctx.moveTo(19, -36);
  ctx.bezierCurveTo(8, -43, -14, -41, -26, -32); ctx.bezierCurveTo(-30, -27, -28, -21, -22, -18);
  ctx.bezierCurveTo(-10, -9, 10, -9, 20, -18); ctx.bezierCurveTo(26, -24, 25, -32, 19, -36); ctx.closePath();
}

function tail(ctx: CanvasRenderingContext2D, p: Palette, time: number): void {
  const curl = Math.sin(time * 1.8) * 2;
  // a cauda é uma fileira de anéis que diminuem ao longo de uma curva enrolada
  const pts: Array<readonly [number, number, number]> = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14, ang = Math.PI * 1.1 + t * Math.PI * 1.55, rad = 17 - t * 11;
    pts.push([-31 + Math.cos(ang) * rad * .85 - t * 6, -14 + Math.sin(ang) * rad + curl * t, 7.4 - t * 5.2]);
  }
  for (const [x, y, r] of pts) {
    const g = ctx.createRadialGradient(x - r * .3, y - r * .3, 1, x, y, r * 1.1); g.addColorStop(0, p.light); g.addColorStop(.6, p.base); g.addColorStop(1, p.dark);
    ctx.fillStyle = g; ctx.strokeStyle = EDGE; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = rgba(p.accent, .6); ctx.lineWidth = .7; ctx.beginPath(); ctx.arc(x, y, r * .6, Math.PI * .9, Math.PI * 1.9); ctx.stroke();
  }
  const [lx, ly] = pts[pts.length - 1]!;
  for (let k = -1; k <= 1; k++) { ctx.save(); ctx.translate(lx, ly); ctx.rotate(k * .55 + curl * .03); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-3, 6, 0, 12); ctx.quadraticCurveTo(3, 6, 0, 0); ctx.fillStyle = k ? p.accent : p.light; ctx.fill(); ctx.strokeStyle = EDGE; ctx.lineWidth = .7; ctx.stroke(); ctx.restore(); }
}

function body(ctx: CanvasRenderingContext2D, p: Palette): void {
  const g = ctx.createLinearGradient(0, -43, 0, -9); g.addColorStop(0, p.light); g.addColorStop(.4, p.base); g.addColorStop(1, shade(p.dark, .05));
  bodyPath(ctx); ctx.fillStyle = g; ctx.fill();
  ctx.save(); bodyPath(ctx); ctx.clip();
  for (let row = 0; row < 7; row++) for (let col = 0; col < 13; col++) {
    const x = -27 + col * 4.4 + (row % 2) * 2.2, y = -42 + row * 4.6;
    ctx.strokeStyle = rgba(row < 3 ? p.light : p.dark, row < 3 ? .5 : .4); ctx.lineWidth = .7; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI); ctx.stroke();
  }
  const belly = ctx.createLinearGradient(0, -22, 0, -8); belly.addColorStop(0, rgba(p.accent, 0)); belly.addColorStop(1, rgba(p.accent, .6)); ctx.fillStyle = belly; ctx.fillRect(-32, -22, 62, 16);
  const shade2 = ctx.createLinearGradient(0, -20, 0, -8); shade2.addColorStop(0, rgba(p.dark, 0)); shade2.addColorStop(1, rgba(p.dark, .3)); ctx.fillStyle = shade2; ctx.fillRect(-32, -20, 62, 14);
  ctx.restore();
  bodyPath(ctx); ctx.strokeStyle = EDGE; ctx.lineWidth = 1.5; ctx.lineJoin = "round"; ctx.stroke();
  ctx.strokeStyle = rgba(GLINT, .5); ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(14, -38.6); ctx.bezierCurveTo(6, -42.4, -12, -40.6, -22, -33); ctx.stroke();
}

function fins(ctx: CanvasRenderingContext2D, p: Palette, time: number): void {
  // dorsal: leque de raios sobre o dorso, que ondula
  for (let k = 0; k < 3; k++) {
    const x = -20 + k * 13, y = -39 - (k % 2) * 2, flutter = Math.sin(time * 2.6 + k) * 1.8;
    const g = ctx.createLinearGradient(x, y - 16, x, y + 6); g.addColorStop(0, rgba(p.light, .9)); g.addColorStop(1, rgba(p.accent, .75));
    ctx.fillStyle = g; ctx.strokeStyle = EDGE; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(x - 7, y + 5); ctx.quadraticCurveTo(x - 7, y - 16 + flutter, x + 4, y - 17 + flutter); ctx.lineTo(x + 10, y + 5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = rgba(GLINT, .6); ctx.lineWidth = .6; for (let j = 0; j < 6; j++) { ctx.beginPath(); ctx.moveTo(x + 1, y + 4); ctx.lineTo(x - 5 + j * 2.4, y - 12 + flutter + (j % 2)); ctx.stroke(); }
  }
  // peitoral: leque que bate
  const beat = Math.sin(time * 2.4) * 3;
  ctx.save(); ctx.translate(9, -24); ctx.rotate(-.3 + beat * .03);
  const pg = ctx.createLinearGradient(0, 0, 14, 10); pg.addColorStop(0, rgba(p.light, .95)); pg.addColorStop(1, rgba(p.accent, .7));
  ctx.fillStyle = pg; ctx.strokeStyle = EDGE; ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(10, -3, 17, 8 + beat); ctx.quadraticCurveTo(8, 11, 0, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = rgba(GLINT, .6); ctx.lineWidth = .55; for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.moveTo(1, 1.4); ctx.lineTo(8 + j * 3, 1 + j * 2.5 + beat * .5); ctx.stroke(); }
  ctx.restore();
}

function head(ctx: CanvasRenderingContext2D, p: Palette, time: number): void {
  ctx.save(); ctx.translate(26, -54);
  const g = ctx.createLinearGradient(-5, -5, 17, 9); g.addColorStop(0, p.light); g.addColorStop(.5, p.base); g.addColorStop(1, shade(p.dark, .1));
  ctx.beginPath(); ctx.moveTo(-6, 0); ctx.bezierCurveTo(-3, -6, 5, -6, 10, -2); ctx.lineTo(20, 0); ctx.quadraticCurveTo(23, 2, 20, 4.5); ctx.lineTo(10, 6); ctx.bezierCurveTo(4, 9, -4, 8, -6, 0); ctx.closePath();
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = EDGE; ctx.lineWidth = 1.3; ctx.lineJoin = "round"; ctx.stroke();
  // franja de espinhos na testa
  for (let i = 0; i < 5; i++) { const sway = Math.sin(time * 2.4 + i) * .8; ctx.fillStyle = i % 2 ? p.accent : p.light; ctx.beginPath(); ctx.moveTo(-5 + i * 2.6, -3.4); ctx.lineTo(-8 + i * 2.2 + sway, -10.5 - (i % 2) * 2); ctx.lineTo(-2.4 + i * 2.6, -4.6); ctx.closePath(); ctx.fill(); ctx.strokeStyle = EDGE; ctx.lineWidth = .7; ctx.stroke(); }
  ellipse(ctx, 18.6, 1.7, 1.5, .9, shade(p.dark, -.4));
  ctx.strokeStyle = shade(p.dark, -.2); ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(9, 5); ctx.quadraticCurveTo(14, 4.6, 19.6, 3.6); ctx.stroke();
  ellipse(ctx, 2.6, -1, 3.2, 3, EDGE); ellipse(ctx, 2.5, -1.1, 2.4, 2.3, p.accent); ellipse(ctx, 2.6, -1.1, 1.2, 1.6, EDGE); ellipse(ctx, 1.8, -2, .8, .7, GLINT);
  ctx.strokeStyle = rgba(GLINT, .5); ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(-2, -3.6); ctx.bezierCurveTo(3, -5, 9, -3, 15, -.4); ctx.stroke();
  ctx.restore();
  // guelras na base do pescoço
  for (let i = 0; i < 4; i++) { ctx.strokeStyle = i % 2 ? p.dark : rgba(p.accent, .9); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(15 + i * 1.6, -36 + i * 2.2); ctx.quadraticCurveTo(18 + i * 1.6, -34 + i * 2.2, 20 + i * 1.6, -35.4 + i * 2.2); ctx.stroke(); }
}

export const drawTidalHippocampus = (ctx: CanvasRenderingContext2D, p: Palette, time: number): void => {
  tail(ctx, p, time);
  drawNeck(ctx, p, NECK);
  body(ctx, p);
  head(ctx, p, time);
  drawMane(ctx, { ...p, dark: shade(p.accent, -.1) }, NECK, time, 12, 8);
  fins(ctx, p, time);
  drawSaddle(ctx, p, TIDAL_HIPPOCAMPUS_TORSO);
  for (let i = 0; i < 10; i++) {
    const x = -29 + i * 8, y = -45 + (i % 4) * 8 + Math.sin(time * 1.5 + i) * 2;
    ctx.strokeStyle = rgba(GLINT, .2 + i % 3 * .2); ctx.lineWidth = .75; ctx.beginPath(); ctx.arc(x, y, 1 + i % 3 * .7, 0, TAU); ctx.stroke();
  }
};
