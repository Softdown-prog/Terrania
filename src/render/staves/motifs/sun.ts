import type { StaffVisualProfile } from "../../../engine/character/Staves.ts";
import { ellipse, mix, rgba } from "../../draw.ts";
import { STAFF_GEM_Y, STAFF_TOP_Y, type StaffTone } from "../shaft.ts";

/** Um raio do disco solar: um triângulo de ouro que sai da borda do disco, com a face clara de um lado e o contorno escuro. */
function ray(ctx: CanvasRenderingContext2D, v: StaffVisualProfile, tone: StaffTone, angle: number, from: number, length: number, width: number): void {
  const cos = Math.cos(angle), sin = Math.sin(angle), nx = -sin, ny = cos;
  const bx = cos * from, by = STAFF_GEM_Y + sin * from, tx = cos * (from + length), ty = STAFF_GEM_Y + sin * (from + length);
  const body = ctx.createLinearGradient(bx, by, tx, ty);
  body.addColorStop(0, tone(v.shaft.dark)); body.addColorStop(0.45, tone(v.shaft.mid)); body.addColorStop(1, tone(v.shaft.light));
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.moveTo(bx + nx * width, by + ny * width); ctx.lineTo(tx, ty); ctx.lineTo(bx - nx * width, by - ny * width); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba("#3a2208", 0.65); ctx.lineWidth = 0.5; ctx.stroke();
  ctx.strokeStyle = rgba(v.sheen, 0.7); ctx.lineWidth = 0.35;
  ctx.beginPath(); ctx.moveTo(bx + nx * width * 0.2, by + ny * width * 0.2); ctx.lineTo(tx, ty); ctx.stroke();
}

/**
 * O que faz o Cajado do Sol Nascente (ADR 0076) parecer de luz: um disco solar de ouro atrás da gema, com doze raios (seis longos e seis curtos)
 * que respiram, aros e o desenho de um sol gravado na haste; e (na frente) o brilho quente em volta da gema, um clarão em cruz e grãos de luz que
 * sobem. `time` faz os raios crescerem e encolherem e os grãos subirem.
 */
export function paintSunMotif(ctx: CanvasRenderingContext2D, v: StaffVisualProfile, tone: StaffTone, time: number, layer: "back" | "front"): void {
  if (layer === "back") {
    for (let i = 0; i < 12; i++) {
      const long = i % 2 === 0, breathe = 1 + 0.12 * Math.sin(time * 2.4 + i * 0.9);
      ray(ctx, v, tone, (i / 12) * Math.PI * 2 + 0.26, 6.4, (long ? 7.4 : 4.4) * breathe, long ? 1.9 : 1.4);
    }
    // o disco: aro de ouro com miolo em degradê, e um segundo aro fino por dentro
    const disc = ctx.createRadialGradient(-1.5, STAFF_GEM_Y - 1.5, 1, 0, STAFF_GEM_Y, 7.6);
    disc.addColorStop(0, tone(v.shaft.light)); disc.addColorStop(0.6, tone(v.shaft.mid)); disc.addColorStop(1, tone(v.shaft.dark));
    ctx.fillStyle = disc; ctx.beginPath(); ctx.arc(0, STAFF_GEM_Y, 7.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rgba("#3a2208", 0.7); ctx.lineWidth = 0.7; ctx.stroke();
    ctx.strokeStyle = tone(v.collar); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(0, STAFF_GEM_Y, 5.6, 0, Math.PI * 2); ctx.stroke();
    // um sol gravado na haste: miolo, quatro raios curtos e dois aros de ouro
    ctx.strokeStyle = tone(v.shaft.dark); ctx.lineWidth = 0.6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-1.5, -14); ctx.lineTo(1.5, -14); ctx.moveTo(0, -16.2); ctx.lineTo(0, -11.8); ctx.moveTo(-1.1, -15.1); ctx.lineTo(1.1, -12.9); ctx.moveTo(1.1, -15.1); ctx.lineTo(-1.1, -12.9); ctx.stroke();
    ctx.strokeStyle = tone(v.shaft.light); ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(-1.9, -8.3); ctx.quadraticCurveTo(0, -7.1, 1.9, -8.3); ctx.moveTo(-1.9, -19.5); ctx.quadraticCurveTo(0, -18.3, 1.9, -19.5); ctx.stroke(); ctx.lineCap = "butt";
    ellipse(ctx, 0, -14, 0.9, 0.9, tone(v.gem.mid)); ellipse(ctx, -0.25, -14.3, 0.35, 0.3, rgba(v.sheen, 0.9));
    ellipse(ctx, 0.5, STAFF_TOP_Y + 3.6, 1, 0.5, tone(mix(v.shaft.mid, v.gem.dark, 0.4)));
    return;
  }
  // o brilho quente em volta da gema e o clarão em cruz que pulsa
  const glow = ctx.createRadialGradient(0, STAFF_GEM_Y, 1, 0, STAFF_GEM_Y, 12);
  glow.addColorStop(0, rgba(v.gem.light, 0.5)); glow.addColorStop(0.55, rgba(v.gem.glow, 0.24)); glow.addColorStop(1, rgba(v.gem.mid, 0));
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, STAFF_GEM_Y, 12, 0, Math.PI * 2); ctx.fill();
  const flare = 0.55 + 0.45 * Math.sin(time * 3.1);
  ctx.strokeStyle = rgba(v.sheen, 0.35 + 0.4 * flare); ctx.lineWidth = 0.55; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-14 * flare - 3, STAFF_GEM_Y); ctx.lineTo(14 * flare + 3, STAFF_GEM_Y); ctx.moveTo(0, STAFF_GEM_Y - 14 * flare - 3); ctx.lineTo(0, STAFF_GEM_Y + 8 * flare + 2); ctx.stroke(); ctx.lineCap = "butt";
  // grãos de luz que sobem e se apagam
  for (let i = 0; i < 4; i++) {
    const rise = (time * 7 + i * 5) % 20, x = Math.sin(time * 2.2 + i * 2.1) * 2.6 + (i - 1.5) * 3.4, fade = 1 - rise / 20, r = 0.5 + fade * 0.9;
    ellipse(ctx, x, STAFF_GEM_Y - 4 - rise, r * 1.6, r * 1.6, rgba(v.gem.glow, 0.28 * fade));
    ellipse(ctx, x, STAFF_GEM_Y - 4 - rise, r, r, rgba(i % 2 ? "#ffffff" : v.gem.light, 0.95 * fade));
  }
}
