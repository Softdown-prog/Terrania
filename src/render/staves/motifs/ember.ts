import type { StaffVisualProfile } from "../../../engine/character/Staves.ts";
import { ellipse, mix, rgba } from "../../draw.ts";
import { STAFF_GEM_Y, STAFF_TOP_Y, type StaffTone } from "../shaft.ts";

/** Uma língua de fogo que nasce no anel e sobe ao lado da gema: base escura, miolo laranja e ponta clara, balançando com o relógio. */
function flame(ctx: CanvasRenderingContext2D, v: StaffVisualProfile, tone: StaffTone, x: number, height: number, width: number, lean: number): void {
  const baseY = STAFF_TOP_Y + 1, tipX = x + lean, tipY = baseY - height;
  const body = ctx.createLinearGradient(x, baseY, tipX, tipY);
  body.addColorStop(0, tone(v.gem.dark)); body.addColorStop(0.5, tone(v.gem.mid)); body.addColorStop(1, rgba(v.gem.light, 0.9));
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(x - width, baseY);
  ctx.quadraticCurveTo(x - width * 1.1 + lean * 0.3, baseY - height * 0.55, tipX, tipY);
  ctx.quadraticCurveTo(x + width * 1.1 + lean * 0.3, baseY - height * 0.5, x + width, baseY);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba("#3a0e04", 0.6); ctx.lineWidth = 0.5; ctx.stroke();
  ctx.fillStyle = rgba(v.gem.light, 0.85);
  ctx.beginPath(); ctx.moveTo(x - width * 0.35, baseY - 0.6); ctx.quadraticCurveTo(x + lean * 0.35, baseY - height * 0.45, x + lean * 0.5, baseY - height * 0.72); ctx.quadraticCurveTo(x + width * 0.5, baseY - height * 0.3, x + width * 0.35, baseY - 0.6); ctx.closePath(); ctx.fill();
}

/**
 * O que faz o Cajado de Brasa Rubra (ADR 0075) parecer de fogo: três línguas de chamas em volta da gema (atrás dela), rachaduras de brasa e
 * bolhas de carvão na haste, e (na frente) o calor em volta da gema e fagulhas que sobem. `time` faz as chamas balançarem e as fagulhas subirem.
 */
export function paintEmberMotif(ctx: CanvasRenderingContext2D, v: StaffVisualProfile, tone: StaffTone, time: number, layer: "back" | "front"): void {
  if (layer === "back") {
    const sway = Math.sin(time * 5), sway2 = Math.sin(time * 4.2 + 1.7);
    flame(ctx, v, tone, -3.2, 13, 2.4, -2.6 + sway * 1.3);
    flame(ctx, v, tone, 3.2, 12, 2.3, 2.6 + sway2 * 1.3);
    flame(ctx, v, tone, 0, 16, 2.2, sway2 * 1.1);
    // brasas dentro das rachaduras da madeira queimada e bolhas de carvão
    ctx.strokeStyle = rgba(v.gem.glow, 0.85); ctx.lineWidth = 1.1; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-1.2, -22); ctx.lineTo(0.6, -19.4); ctx.lineTo(-0.5, -16.6); ctx.moveTo(1, -7.4); ctx.lineTo(-0.7, -4.6); ctx.lineTo(0.5, -1.8); ctx.stroke();
    ctx.strokeStyle = tone(v.gem.light); ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(-1.2, -22); ctx.lineTo(0.6, -19.4); ctx.moveTo(1, -7.4); ctx.lineTo(-0.7, -4.6); ctx.stroke(); ctx.lineCap = "butt";
    for (const [x, y, r] of [[1, -13, 1.3], [-1.1, 3, 1.1], [0.9, 9, 1]] as const) {
      ellipse(ctx, x, y + 0.4, r, r * 0.8, tone(v.shaft.dark)); ellipse(ctx, x, y, r * 0.8, r * 0.65, tone(v.shaft.mid)); ellipse(ctx, x + r * 0.15, y + r * 0.2, r * 0.45, r * 0.35, tone(mix(v.shaft.mid, v.gem.dark, 0.35)));
      ellipse(ctx, x - r * 0.25, y - r * 0.25, r * 0.35, r * 0.25, rgba(v.sheen, 0.7));
    }
    return;
  }
  // o calor em volta da gema e quatro fagulhas que sobem e se apagam
  const heat = ctx.createRadialGradient(0, STAFF_GEM_Y, 1, 0, STAFF_GEM_Y, 9);
  heat.addColorStop(0, rgba(v.gem.light, 0.45)); heat.addColorStop(0.6, rgba(v.gem.glow, 0.22)); heat.addColorStop(1, rgba(v.gem.mid, 0));
  ctx.fillStyle = heat; ctx.beginPath(); ctx.arc(0, STAFF_GEM_Y, 9, 0, Math.PI * 2); ctx.fill();
  // fio de fumaça cinza que sobe devagar e cinza clara na ponta dos ramos queimados
  for (let i = 0; i < 2; i++) {
    const rise = (time * 3.4 + i * 7) % 14, drift = Math.sin(time * 1.6 + i * 2.6) * 2.2, fade = 1 - rise / 14;
    ctx.strokeStyle = rgba("#6b5b54", 0.35 * fade); ctx.lineWidth = 1.1; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(drift - 3 + i * 6, STAFF_GEM_Y - 9 - rise); ctx.quadraticCurveTo(drift + 1 + i * 5, STAFF_GEM_Y - 12 - rise, drift - 2 + i * 6, STAFF_GEM_Y - 15 - rise); ctx.stroke(); ctx.lineCap = "butt";
  }
  ellipse(ctx, -0.6, STAFF_TOP_Y + 4.6, 1, 0.6, tone(v.shaft.light)); // cinza clara na quina queimada
  for (let i = 0; i < 4; i++) {
    const rise = (time * 9 + i * 4.5) % 18, x = Math.sin(time * 3 + i * 1.9) * 2.4 + (i - 1.5) * 2.6, fade = 1 - rise / 18;
    ellipse(ctx, x, STAFF_GEM_Y - 3 - rise, 0.9 * (0.5 + fade * 0.6), 0.9 * (0.5 + fade * 0.6), rgba(i % 2 ? "#ffffff" : v.gem.light, 0.9 * fade));
    ellipse(ctx, x, STAFF_GEM_Y - 3 - rise + 1.2, 0.5, 0.9, rgba(v.gem.mid, 0.6 * fade));
  }
}
