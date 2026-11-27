import { ellipse, mix, rgba, shade, softShadow, TAU } from "./draw.ts";

/**
 * Pontos de coleta da Masmorra das Raízes (ADR 0105). Arte pura, peça física auditada como `prop`, em duas versões: um tufo de **cogumelos** de chapéu avermelhado com pintas claras
 * e um tufo de **raízes** retorcidas com seiva verde brilhando nos nós. Origem em (sx, sy) = o centro da base, no chão; luz da esquerda e de cima; o brilho pulsa devagar com `time`.
 */
const OUTLINE = "#142a2a";
const GLINT = "#fff6dc";
const SOIL = "#3b3126";

function cap(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, base: string): void {
  const grad = ctx.createLinearGradient(x - w, y - h, x + w, y + h * .4);
  grad.addColorStop(0, mix(base, GLINT, .3)); grad.addColorStop(.55, base); grad.addColorStop(1, shade(base, -.4));
  ctx.fillStyle = OUTLINE;
  ctx.beginPath(); ctx.ellipse(x, y, w + 1.2, h + 1.2, 0, Math.PI, TAU); ctx.closePath(); ctx.fill();
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, Math.PI, TAU); ctx.closePath(); ctx.fill();
  for (const [dx, dy, r] of [[-.4, -.55, 1.1], [.25, -.7, .9], [.55, -.3, .8]] as const) ellipse(ctx, x + dx * w, y + dy * h, r, r * .7, rgba(GLINT, .8));
  ctx.strokeStyle = rgba(GLINT, .55); ctx.lineWidth = .8;
  ctx.beginPath(); ctx.ellipse(x - w * .1, y, w * .86, h * .86, 0, Math.PI * 1.08, Math.PI * 1.45); ctx.stroke();
}

function mushrooms(ctx: CanvasRenderingContext2D, time: number): void {
  const stem = (x: number, top: number, bottom: number, w: number): void => {
    const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
    g.addColorStop(0, mix("#e9dcc0", GLINT, .3)); g.addColorStop(1, shade("#d8c8a6", -.35));
    ctx.fillStyle = OUTLINE; ctx.fillRect(x - w - .9, top, w * 2 + 1.8, bottom - top);
    ctx.fillStyle = g; ctx.fillRect(x - w, top, w * 2, bottom - top);
  };
  stem(-8, -9, 1, 2); cap(ctx, -8, -8, 7, 5.6, "#b8453a");
  stem(7, -6, 1, 1.6); cap(ctx, 7, -5, 5.4, 4.4, "#c9593e");
  stem(0, -14, 1, 2.4); cap(ctx, 0, -13, 8.6, 7, "#a63b36");
  const glow = .35 + .25 * Math.sin(time * 1.9);
  const halo = ctx.createRadialGradient(0, -8, 1, 0, -8, 20);
  halo.addColorStop(0, rgba("#ffd9a0", glow)); halo.addColorStop(1, rgba("#ffd9a0", 0));
  ctx.fillStyle = halo; ctx.fillRect(-22, -28, 44, 36);
}

function roots(ctx: CanvasRenderingContext2D, time: number): void {
  const bark = (x0: number, x1: number, y1: number, bend: number, width: number): void => {
    ctx.lineCap = "round";
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = width + 1.8;
    ctx.beginPath(); ctx.moveTo(x0, 1); ctx.quadraticCurveTo(x0 + bend, (1 + y1) / 2, x1, y1); ctx.stroke();
    ctx.strokeStyle = mix("#7a5a3a", GLINT, .08); ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(x0, 1); ctx.quadraticCurveTo(x0 + bend, (1 + y1) / 2, x1, y1); ctx.stroke();
    ctx.strokeStyle = rgba(GLINT, .35); ctx.lineWidth = width * .28;
    ctx.beginPath(); ctx.moveTo(x0 - width * .2, 0); ctx.quadraticCurveTo(x0 + bend - width * .2, (1 + y1) / 2, x1 - width * .2, y1 + 1); ctx.stroke();
  };
  bark(-9, -12, -14, -6, 3.6); bark(-2, 2, -19, 5, 4.2); bark(7, 11, -12, 6, 3.2);
  const pulse = .55 + .3 * Math.sin(time * 2.2);
  for (const [x, y, r] of [[-11, -10, 2.2], [1, -15, 2.8], [10, -9, 2]] as const) {
    const sap = ctx.createRadialGradient(x, y, .3, x, y, r * 3.4);
    sap.addColorStop(0, rgba("#d9ff9c", pulse)); sap.addColorStop(1, rgba("#8fe05a", 0));
    ctx.fillStyle = sap; ctx.fillRect(x - r * 3.4, y - r * 3.4, r * 6.8, r * 6.8);
    ellipse(ctx, x, y, r, r * .8, rgba("#b7f26a", .95)); ellipse(ctx, x - r * .3, y - r * .3, r * .35, r * .3, rgba(GLINT, .9));
  }
  ctx.strokeStyle = rgba("#9be85f", .8); ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(1, -12); ctx.quadraticCurveTo(3, -6, 2, 0); ctx.stroke();
}

export function drawCaveHerb(ctx: CanvasRenderingContext2D, kind: "spores" | "sap", sx: number, sy: number, time = 0): void {
  ctx.save();
  ctx.translate(sx, sy);
  // 1. Sombra de contato e a terra remexida onde o tufo nasce.
  softShadow(ctx, 0, 2, 16, 5, .45);
  ellipse(ctx, 0, 1.5, 13, 4, shade(SOIL, -.2)); ellipse(ctx, -1, 1, 11, 3.2, SOIL);
  for (const [x, y] of [[-9, 2], [-3, 3], [5, 2.4], [10, 1.6]] as const) ellipse(ctx, x, y, 1.6, .9, shade(SOIL, .25));
  // 2-8. O tufo, com volume, contorno, brilho e luz própria.
  if (kind === "spores") mushrooms(ctx, time); else roots(ctx, time);
  ctx.restore();
}
