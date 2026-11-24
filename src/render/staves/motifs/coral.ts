import type { StaffVisualProfile } from "../../../engine/character/Staves.ts";
import { ellipse, mix, rgba } from "../../draw.ts";
import { STAFF_GEM_Y, STAFF_TOP_Y, type StaffTone } from "../shaft.ts";

/** Um ramo de coral que se bifurca: o tronco, dois galhos e o pólipo claro na ponta de cada um. */
function branch(ctx: CanvasRenderingContext2D, v: StaffVisualProfile, tone: StaffTone, x: number, y: number, tipX: number, tipY: number, bend: number): void {
  const midX = (x + tipX) / 2 + bend, midY = (y + tipY) / 2;
  ctx.lineCap = "round";
  ctx.strokeStyle = rgba("#4a1c1a", 0.7); ctx.lineWidth = 2.7;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(midX, midY, tipX, tipY); ctx.stroke();
  ctx.strokeStyle = tone(mix(v.shaft.mid, v.shaft.dark, 0.35)); ctx.lineWidth = 2.1;
  ctx.beginPath(); ctx.moveTo(x + 0.3, y); ctx.quadraticCurveTo(midX + 0.4, midY, tipX + 0.3, tipY); ctx.stroke();
  ctx.strokeStyle = tone(v.shaft.mid); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(midX, midY, tipX, tipY); ctx.stroke();
  ctx.strokeStyle = tone(v.shaft.light); ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(x - 0.4, y - 0.4); ctx.quadraticCurveTo(midX - 0.4, midY, tipX - 0.4, tipY); ctx.stroke();
  ctx.lineCap = "butt";
  ellipse(ctx, tipX, tipY, 1.5, 1.3, tone(v.shaft.dark));
  ellipse(ctx, tipX, tipY, 1.05, 0.9, tone(v.shaft.light));
}

/**
 * O que faz o Cajado das Marés (ADR 0073) parecer de água: ramos de coral que abrem como uma coroa em volta da gema (atrás dela), um
 * ramo no meio da haste, e (na frente) a pérola azul com sua bolha de luz e três bolhas que sobem. `time` faz as bolhas subirem.
 */
export function paintCoralMotif(ctx: CanvasRenderingContext2D, v: StaffVisualProfile, tone: StaffTone, time: number, layer: "back" | "front"): void {
  if (layer === "back") {
    branch(ctx, v, tone, -1.8, STAFF_TOP_Y + 1, -8.2, STAFF_GEM_Y - 3, -2);
    branch(ctx, v, tone, -1.4, STAFF_TOP_Y + 1.4, -5, STAFF_GEM_Y + 4.4, -1.5);
    branch(ctx, v, tone, 1.8, STAFF_TOP_Y + 1, 8.2, STAFF_GEM_Y - 3, 2);
    branch(ctx, v, tone, 1.4, STAFF_TOP_Y + 1.4, 5, STAFF_GEM_Y + 4.4, 1.5);
    branch(ctx, v, tone, 1.4, -11, 6.4, -17.4, 1.6);
    // um fio de alga presa na haste
    ctx.strokeStyle = "#3f9a82"; ctx.lineWidth = 1.1; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-1.6, -4); ctx.quadraticCurveTo(-5.4, -7, -3.6, -11.4); ctx.quadraticCurveTo(-2.2, -14, -4.4, -16); ctx.stroke();
    ctx.strokeStyle = "#8fe0b4"; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(-1.8, -4.6); ctx.quadraticCurveTo(-5, -7.4, -3.4, -11.2); ctx.stroke(); ctx.lineCap = "butt";
    return;
  }
  // bolha de luz em volta da pérola e três bolhas subindo
  const bubble = ctx.createRadialGradient(-1, STAFF_GEM_Y - 1, 0.5, 0, STAFF_GEM_Y, 6.4);
  bubble.addColorStop(0, rgba("#ffffff", 0.5)); bubble.addColorStop(0.7, rgba(v.gem.light, 0.18)); bubble.addColorStop(1, rgba(v.gem.glow, 0.45));
  ctx.fillStyle = bubble; ctx.beginPath(); ctx.arc(0, STAFF_GEM_Y, 6.4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = rgba(v.gem.light, 0.75); ctx.lineWidth = 0.6; ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const rise = (time * 5 + i * 5) % 15, x = Math.sin(time * 2 + i * 2.1) * 1.4 + (i - 1) * 3.4;
    ctx.strokeStyle = rgba(v.gem.light, 0.8 * (1 - rise / 15)); ctx.lineWidth = 0.55;
    ctx.beginPath(); ctx.arc(x, STAFF_GEM_Y - 5 - rise, 0.9 + (i % 2) * 0.5, 0, Math.PI * 2); ctx.stroke();
  }
}
