import type { StaffVisualProfile } from "../../../engine/character/Staves.ts";
import { ellipse, mix, rgba } from "../../draw.ts";
import { STAFF_GEM_Y, STAFF_TOP_Y, type StaffTone } from "../shaft.ts";

/** Uma estrela de quatro pontas que pisca (as pontas curvam para dentro). */
function twinkle(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, size: number, alpha: number): void {
  ctx.fillStyle = rgba(color, alpha);
  ctx.beginPath(); ctx.moveTo(x, y - size); ctx.quadraticCurveTo(x + size * 0.12, y - size * 0.12, x + size, y); ctx.quadraticCurveTo(x + size * 0.12, y + size * 0.12, x, y + size);
  ctx.quadraticCurveTo(x - size * 0.12, y + size * 0.12, x - size, y); ctx.quadraticCurveTo(x - size * 0.12, y - size * 0.12, x, y - size); ctx.closePath(); ctx.fill();
}

/** A estrela grande de oito pontas atrás da gema: quatro pontas longas nos pontos cardeais e quatro curtas nas diagonais, de ouro com a face clara. */
function bigStar(ctx: CanvasRenderingContext2D, v: StaffVisualProfile, tone: StaffTone): void {
  const tips: Array<[number, number]> = [];
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2 - Math.PI / 2, radius = i % 4 === 0 ? 13.5 : i % 2 === 0 ? 8.6 : 4.4;
    tips.push([Math.cos(angle) * radius, STAFF_GEM_Y + Math.sin(angle) * radius]);
  }
  const body = ctx.createRadialGradient(-2, STAFF_GEM_Y - 3, 1, 0, STAFF_GEM_Y, 13.5);
  body.addColorStop(0, tone(v.collar)); body.addColorStop(0.55, tone(v.collarDark)); body.addColorStop(1, tone(v.ferrule));
  ctx.fillStyle = body;
  ctx.beginPath(); tips.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba("#2a1c06", 0.7); ctx.lineWidth = 0.6; ctx.stroke();
  // o fio claro no meio de cada ponta longa
  ctx.strokeStyle = tone(v.ferruleLight); ctx.lineWidth = 0.45; ctx.beginPath();
  for (const [x, y] of [tips[0]!, tips[4]!, tips[8]!, tips[12]!]) { ctx.moveTo(x * 0.25, STAFF_GEM_Y + (y - STAFF_GEM_Y) * 0.25); ctx.lineTo(x * 0.92, STAFF_GEM_Y + (y - STAFF_GEM_Y) * 0.92); }
  ctx.stroke();
}

/**
 * O que faz o Cajado Astral de Terrania (ADR 0077) parecer feito de estrelas: uma grande estrela de oito pontas de ouro atrás da gema perolada, um
 * anel de órbita inclinado, e uma constelação de pontos de ouro ligados por fios na haste de marfim; e (na frente) o brilho pálido em volta da gema,
 * duas estrelinhas que giram na órbita, três estrelas que piscam e poeira de estrela que sobe. `time` faz as estrelinhas girarem, as outras piscarem e a poeira subir.
 */
export function paintAstralMotif(ctx: CanvasRenderingContext2D, v: StaffVisualProfile, tone: StaffTone, time: number, layer: "back" | "front"): void {
  if (layer === "back") {
    bigStar(ctx, v, tone);
    // a órbita: uma elipse inclinada em volta da gema, a metade de trás
    ctx.strokeStyle = tone(v.collarDark); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(0, STAFF_GEM_Y, 9.4, Math.PI, Math.PI * 2); ctx.stroke();
    // a constelação na haste: cinco estrelas de ouro ligadas por fios finos
    const dots: Array<[number, number]> = [[-0.9, -21], [0.8, -16.5], [-0.5, -11.5], [0.9, -6.2], [-0.4, -1.4]];
    ctx.strokeStyle = tone(v.collarDark); ctx.lineWidth = 0.4; ctx.beginPath(); dots.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)); ctx.stroke();
    ctx.strokeStyle = tone(v.shaft.dark); ctx.lineWidth = 0.35; ctx.beginPath(); ctx.moveTo(-1.4, -13.8); ctx.quadraticCurveTo(0.4, -12.6, 1.5, -14.2); ctx.moveTo(-1.4, -3.9); ctx.quadraticCurveTo(0.2, -2.8, 1.5, -4.2); ctx.stroke();
    dots.forEach(([x, y], i) => { ellipse(ctx, x, y, 0.95 + (i % 2) * 0.3, 0.95 + (i % 2) * 0.3, tone(v.collar)); ellipse(ctx, x - 0.2, y - 0.2, 0.35, 0.35, rgba(v.sheen, 0.95)); });
    // dois anéis de marfim torneado na haste, com sombra e brilho
    for (const y of [-24, -8.6]) { ellipse(ctx, 0, y + 0.5, 2.5, 1.2, tone(v.shaft.dark)); ellipse(ctx, 0, y, 2.4, 1.1, tone(v.shaft.mid)); ellipse(ctx, -0.4, y - 0.3, 1.5, 0.6, tone(v.shaft.light)); }
    ellipse(ctx, 0.5, STAFF_TOP_Y + 3.6, 1, 0.5, tone(mix(v.shaft.mid, v.shaft.dark, 0.5)));
    return;
  }
  const halo = ctx.createRadialGradient(0, STAFF_GEM_Y, 1, 0, STAFF_GEM_Y, 12);
  halo.addColorStop(0, rgba(v.gem.light, 0.5)); halo.addColorStop(0.55, rgba(v.gem.glow, 0.24)); halo.addColorStop(1, rgba(v.gem.mid, 0));
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, STAFF_GEM_Y, 12, 0, Math.PI * 2); ctx.fill();
  // a metade da frente da órbita e as duas estrelinhas que giram nela
  ctx.strokeStyle = rgba(v.collar, 0.85); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(0, STAFF_GEM_Y, 9.4, 0, Math.PI); ctx.stroke();
  for (let i = 0; i < 2; i++) {
    const angle = time * 1.6 + i * Math.PI, x = Math.cos(angle) * 9.4, y = STAFF_GEM_Y + Math.sin(angle) * 9.4 * 0.62;
    ellipse(ctx, x, y, 2.4, 2.4, rgba(v.gem.glow, 0.35)); twinkle(ctx, i ? v.gem.light : "#ffffff", x, y, 2.2, 0.95);
  }
  for (let i = 0; i < 3; i++) {
    const a = i * 2.3 + 0.9, pulse = 0.5 + 0.5 * Math.sin(time * 3 + i * 2.4);
    twinkle(ctx, i % 2 ? v.collar : "#ffffff", Math.cos(a) * 12, STAFF_GEM_Y - 2 + Math.sin(a) * 10, 1 + pulse * 1.6, 0.35 + pulse * 0.6);
  }
  // poeira de estrela que sobe e se apaga
  for (let i = 0; i < 3; i++) {
    const rise = (time * 6 + i * 6.5) % 19, x = Math.sin(time * 1.9 + i * 2.6) * 2.4 + (i - 1) * 4, fade = 1 - rise / 19;
    ellipse(ctx, x, STAFF_GEM_Y - 5 - rise, 0.4 + fade * 0.7, 0.4 + fade * 0.7, rgba(i % 2 ? "#ffffff" : v.gem.glow, 0.9 * fade));
  }
}
