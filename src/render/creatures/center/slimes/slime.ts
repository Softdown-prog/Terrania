/** Arte completa da Slime: forma, movimentação, olhos, mordida, dor e vida. */
import type { Slime } from "../../../../actors/Slime.ts";
import { CREATURE_CATALOG } from "../../../../actors/CreatureCatalog.ts";
import { blink, slimePose } from "../../../animation.ts";
import { clamp01, ellipse, hashString, mix, pill, rgba, softShadow, TAU } from "../../../draw.ts";

export type SlimeVisual = Pick<Slime, "hp" | "bounce"> & { hurtTime?: number; id?: string };
/** Contexto opcional de apresentação; nada aqui altera regras ou dano. */
export interface SlimeFx {
  time?: number;
  /** Vetor mundo até o herói, para os olhos e a inclinação. */
  lookX?: number;
  lookY?: number;
  /** 0..1: proximidade do herói (a criatura se agacha e ameaça). */
  near?: number;
  /** 0..1: mordida/investida recém-sofrida pelo herói. */
  bite?: number;
}

interface SlimePalette { l: string; m: string; d: string; rim: string; core: string }
const SLIME_PALETTES: readonly SlimePalette[] = [
  { l: "#c4ecb4", m: "#6fba94", d: "#2e7068", rim: "#e0fbd2", core: "#2c7566" },
  { l: "#b9eadf", m: "#62b4b2", d: "#2a6c78", rim: "#d8fbf3", core: "#27687a" },
  { l: "#d6edA0", m: "#8cc46c", d: "#3f7c4d", rim: "#f0ffc8", core: "#3f7f45" },
];

/**
 * Slime gelatinosa: contorno que ondula, núcleo e bolhas internas, brilho
 * especular, olhos que seguem o herói e piscam, expressão de ameaça ao se
 * aproximar/morder e de dor ao ser atingida, com squash & stretch.
 */
export function renderSlime(
  ctx: CanvasRenderingContext2D,
  slime: SlimeVisual,
  sx: number,
  sy: number,
  fx: SlimeFx = {},
): void {
  const t = fx.time ?? 0;
  const seed = slime.id ? hashString(slime.id) : 0.37;
  const pal = SLIME_PALETTES[Math.floor(seed * 2.999)] ?? SLIME_PALETTES[0]!;
  const size = 0.94 + ((seed * 97) % 1) * 0.14;
  const hurt = slime.hurtTime ?? 0;
  const flash = hurt > 0.1 ? clamp01((hurt - 0.1) / 0.06) : 0;
  const near = fx.near ?? 0, bite = fx.bite ?? 0;
  const pose = slimePose(slime.bounce, hurt, near, bite);
  const lookLen = Math.hypot(fx.lookX ?? 0, fx.lookY ?? 0) || 1;
  const lx = (fx.lookX ?? 0) / lookLen, ly = (fx.lookY ?? 1) / lookLen;
  const tone = (c: string): string => (flash > 0 ? mix(c, "#f6fbe9", flash * 0.85) : c);

  ctx.save();
  ctx.translate(sx, sy);
  softShadow(ctx, 1, 4, 13 * size * (1 - Math.min(0.3, pose.lift * 0.05)), 4.4, 0.32);
  // O corpo (inclinação, escala) vive em um escopo próprio; a barra de vida abaixo usa só a posição.
  ctx.save();
  ctx.translate(lx * pose.lean * 0.6, -pose.lift);
  ctx.scale(size, size);
  ctx.translate(0, 2);
  ctx.scale(pose.scaleX, pose.scaleY);
  ctx.translate(0, -2);

  // contorno ondulante
  const N = 18, cy = -8.2;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU;
    const wob = 1 + 0.035 * Math.sin(a * 3 + t * 5.5 + seed * 9) + 0.02 * Math.sin(a * 5 - t * 3.2) +
      bite * 0.07 * Math.max(0, Math.cos(a) * lx + Math.sin(a) * ly);
    const s = Math.sin(a);
    pts.push([Math.cos(a) * 14.2 * wob, cy + s * (s > 0 ? 10.2 : 12.8) * wob]);
  }
  const path = (): void => {
    ctx.beginPath();
    const last = pts[N - 1]!, first = pts[0]!;
    ctx.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2);
    for (let i = 0; i < N; i++) {
      const p = pts[i]!, q = pts[(i + 1) % N]!;
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    ctx.closePath();
  };
  const fill = ctx.createRadialGradient(-5, -15, 1.5, 0, -7, 20);
  fill.addColorStop(0, tone(pal.l)); fill.addColorStop(0.5, tone(pal.m)); fill.addColorStop(1, tone(pal.d));
  path();
  ctx.fillStyle = fill; ctx.fill();
  ctx.save();
  path(); ctx.clip();
  // núcleo e bolhas
  ellipse(ctx, 1.5, -5.6, 6.8, 4.8, rgba(pal.core, 0.32));
  ellipse(ctx, 2.2, -5.2, 3.6, 2.6, rgba(pal.core, 0.28));
  const bubbleY = (k: number): number => -2 - ((t * 2.2 + k * 0.37) % 1) * 11 * (t ? 1 : 0.5);
  ctx.fillStyle = rgba("#ffffff", 0.35);
  ctx.beginPath(); ctx.arc(-6 + Math.sin(t * 2 + 1) * 1.2, bubbleY(0), 1.5, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(7 + Math.sin(t * 2.6) * 1, bubbleY(1), 1.05, 0, TAU); ctx.fill();
  // luz de contorno
  ctx.translate(-1.6, -2.4);
  path();
  ctx.strokeStyle = rgba(pal.rim, 0.34); ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
  path();
  ctx.strokeStyle = rgba(pal.d, 0.9); ctx.lineWidth = 1.3; ctx.stroke();
  // brilhos especulares
  ctx.save();
  ctx.translate(-6.4, -15.4); ctx.rotate(-0.55);
  ellipse(ctx, 0, 0, 4.6, 2.3, rgba("#ffffff", 0.58));
  ctx.restore();
  ellipse(ctx, -1.2, -18, 1.1, 1.1, rgba("#ffffff", 0.6));
  ellipse(ctx, 5.5, -2.4, 5, 1.3, rgba("#ffffff", 0.13));

  // rosto
  const eyeY = -9.4 + near * 1.2;
  const closed = hurt > 0.04 ? 1 : blink(t, seed * 10);
  const ex = [-4.9, 4.9];
  for (const x of ex) {
    if (hurt > 0.04) {
      ctx.strokeStyle = tone("#1c3a3a"); ctx.lineWidth = 1.5; ctx.lineCap = "round";
      ctx.beginPath();
      const d = x < 0 ? 1 : -1;
      ctx.moveTo(x - 2.2 * d, eyeY - 2); ctx.lineTo(x + 1.2 * d, eyeY); ctx.lineTo(x - 2.2 * d, eyeY + 2);
      ctx.stroke(); ctx.lineCap = "butt";
      continue;
    }
    const open = Math.max(0.12, 1 - closed);
    ellipse(ctx, x, eyeY, 3, 3.5 * open, "#eef8e6");
    ellipse(ctx, x + lx * 1.3, eyeY + ly * 0.9, (1.7 + near * 0.3) , 2.1 * open, "#1d3a3b");
    if (open > 0.5) ellipse(ctx, x + lx * 1.3 + 0.5, eyeY + ly * 0.9 - 0.8, 0.55, 0.55, "#ffffff");
    if (near > 0.3 || bite > 0) {
      ctx.strokeStyle = tone(pal.d); ctx.lineWidth = 1.7;
      ctx.beginPath();
      const d = x < 0 ? 1 : -1;
      ctx.moveTo(x - 3 * d, eyeY - 4.8); ctx.lineTo(x + 3 * d, eyeY - 3 - near * 1.2);
      ctx.stroke();
    }
  }
  if (bite > 0.05) {
    ellipse(ctx, 0, -2.6, 3.8 * bite + 1, 2.7 * bite + 0.6, "#1b3a3a");
    ctx.fillStyle = "#f4fbe8";
    ctx.beginPath();
    ctx.moveTo(-2.2, -4.6); ctx.lineTo(-0.8, -4.6); ctx.lineTo(-1.5, -2.8); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0.8, -4.6); ctx.lineTo(2.2, -4.6); ctx.lineTo(1.5, -2.8); ctx.closePath(); ctx.fill();
  } else if (hurt > 0.04) {
    ctx.strokeStyle = tone("#1f514a"); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-3, -2.6); ctx.quadraticCurveTo(-1.5, -4.2, 0, -2.6); ctx.quadraticCurveTo(1.5, -1, 3, -2.6); ctx.stroke();
  } else {
    ctx.strokeStyle = tone("#1f514a"); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-2.6, -3.2); ctx.quadraticCurveTo(0, near > 0.3 ? -4.4 : -1.6, 2.6, -3.2); ctx.stroke();
  }
  ctx.restore();

  // barra de vida só quando ferida
  const { maxHp } = CREATURE_CATALOG.slime;
  if (slime.hp < maxHp) {
    const frac = Math.max(0, slime.hp) / maxHp;
    ctx.fillStyle = "rgba(14,38,34,.82)";
    pill(ctx, -11.5, -31, 23, 5); ctx.fill();
    ctx.fillStyle = mix("#d85f45", "#a6e08f", frac);
    pill(ctx, -10, -29.8, 20 * frac, 2.6); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.35)";
    ctx.fillRect(-10, -29.8, 20 * frac, 0.9);
  }
  ctx.restore();
}
