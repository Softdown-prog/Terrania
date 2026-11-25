import type { StaffVisualProfile } from "../../../engine/character/Staves.ts";
import { rgba } from "../../draw.ts";
import { STAFF_GEM_Y, STAFF_TOP_Y, type StaffTone } from "../shaft.ts";

/** Um estilhaço de gelo: um prisma comprido que nasce no anel, com uma face clara e outra escura, contorno e uma linha de faceta. */
function shard(ctx: CanvasRenderingContext2D, v: StaffVisualProfile, tone: StaffTone, angle: number, length: number, width: number): void {
  ctx.save(); ctx.translate(0, STAFF_TOP_Y + 0.4); ctx.rotate(angle);
  const body = ctx.createLinearGradient(-width, 0, width, -length);
  body.addColorStop(0, tone(v.shaft.dark)); body.addColorStop(0.5, tone(v.shaft.mid)); body.addColorStop(1, tone(v.shaft.light));
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.moveTo(-width, 0); ctx.lineTo(-width * 0.7, -length * 0.82); ctx.lineTo(0, -length); ctx.lineTo(width * 0.7, -length * 0.82); ctx.lineTo(width, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = tone(v.shaft.dark); ctx.lineWidth = 0.6; ctx.stroke();
  ctx.fillStyle = rgba(v.sheen, 0.55);
  ctx.beginPath(); ctx.moveTo(-width * 0.3, -0.5); ctx.lineTo(-width * 0.55, -length * 0.8); ctx.lineTo(0, -length * 0.96); ctx.lineTo(-width * 0.05, -length * 0.4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = tone(v.gem.glow); ctx.lineWidth = 0.35;
  ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(0, -length * 0.93); ctx.stroke();
  ctx.restore();
}

/** Uma faísca de gelo de quatro pontas que pisca. */
function twinkle(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, size: number, alpha: number): void {
  ctx.fillStyle = rgba(color, alpha);
  ctx.beginPath(); ctx.moveTo(x, y - size); ctx.lineTo(x + size * 0.28, y - size * 0.28); ctx.lineTo(x + size, y); ctx.lineTo(x + size * 0.28, y + size * 0.28); ctx.lineTo(x, y + size);
  ctx.lineTo(x - size * 0.28, y + size * 0.28); ctx.lineTo(x - size, y); ctx.lineTo(x - size * 0.28, y - size * 0.28); ctx.closePath(); ctx.fill();
}

/**
 * O que faz o Cajado da Geada Boreal (ADR 0075) parecer de gelo: quatro estilhaços de cristal em leque atrás da gema, cristais de geada
 * cravados na haste, e (na frente) um halo frio e três faíscas de gelo que piscam em volta da gema. `time` faz as faíscas piscarem.
 */
export function paintCrystalMotif(ctx: CanvasRenderingContext2D, v: StaffVisualProfile, tone: StaffTone, time: number, layer: "back" | "front"): void {
  if (layer === "back") {
    shard(ctx, v, tone, -0.95, 12.5, 2.3); shard(ctx, v, tone, 0.95, 12.5, 2.3); shard(ctx, v, tone, -0.4, 15, 2.5); shard(ctx, v, tone, 0.4, 15, 2.5);
    // cristais de geada cravados na haste: losangos com brilho
    for (const [x, y, r] of [[0.6, -18, 2.1], [-0.8, -9, 1.8], [0.5, 4, 1.6]] as const) {
      ctx.fillStyle = tone(v.shaft.light);
      ctx.beginPath(); ctx.moveTo(x, y - r * 1.5); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r * 1.5); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = tone(v.shaft.dark); ctx.lineWidth = 0.5; ctx.stroke();
      ctx.strokeStyle = tone(v.gem.glow); ctx.lineWidth = 0.35; ctx.beginPath(); ctx.moveTo(x, y - r * 1.2); ctx.lineTo(x, y + r * 1.2); ctx.stroke();
    }
    // gavinhas curvas de geada que sobem pela haste, com um fio de névoa fria
    ctx.lineCap = "round"; ctx.strokeStyle = "#10283f"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-1.6, 10); ctx.quadraticCurveTo(-4.6, 5, -2.2, 0.6); ctx.quadraticCurveTo(-1, -2.4, -3.4, -5); ctx.stroke();
    ctx.strokeStyle = "#bfe9ff"; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(-1.7, 9.6); ctx.quadraticCurveTo(-4.4, 5, -2.1, 0.8); ctx.stroke();
    ctx.strokeStyle = rgba("#d6f1ff", 0.7); ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(1.8, 12); ctx.quadraticCurveTo(4.8, 8, 2.6, 4); ctx.stroke(); ctx.lineCap = "butt";
    return;
  }
  const halo = ctx.createRadialGradient(0, STAFF_GEM_Y, 1, 0, STAFF_GEM_Y, 10);
  halo.addColorStop(0, rgba(v.gem.light, 0.4)); halo.addColorStop(0.6, rgba(v.gem.glow, 0.2)); halo.addColorStop(1, rgba(v.gem.mid, 0));
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, STAFF_GEM_Y, 10, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = rgba("#d6f1ff", 0.55); ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.arc(0, STAFF_GEM_Y, 7.2, time * 0.8, time * 0.8 + 1.7); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, STAFF_GEM_Y, 7.2, time * 0.8 + Math.PI, time * 0.8 + Math.PI + 1.7); ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + 0.4, pulse = 0.5 + 0.5 * Math.sin(time * 3.2 + i * 2.3);
    twinkle(ctx, i % 2 ? v.gem.light : "#ffffff", Math.cos(a) * 8.6, STAFF_GEM_Y + Math.sin(a) * 6.2, 1.2 + pulse * 1.5, 0.35 + pulse * 0.6);
  }
}
