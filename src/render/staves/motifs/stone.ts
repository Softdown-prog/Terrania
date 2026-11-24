import type { StaffVisualProfile } from "../../../engine/character/Staves.ts";
import { ellipse, rgba } from "../../draw.ts";
import { STAFF_GEM_Y, STAFF_TOP_Y, type StaffTone } from "../shaft.ts";

/** Um bloco de rocha facetado: uma face escura, uma clara na quina de cima e o contorno. */
function slab(ctx: CanvasRenderingContext2D, v: StaffVisualProfile, tone: StaffTone, points: ReadonlyArray<readonly [number, number]>): void {
  const [first, ...rest] = points; if (!first) return;
  ctx.beginPath(); ctx.moveTo(first[0], first[1]); for (const [x, y] of rest) ctx.lineTo(x, y); ctx.closePath();
  const [first2, last2] = [points[0]!, points[points.length - 1]!];
  const face = ctx.createLinearGradient(first2[0], first2[1], last2[0], last2[1] + 6);
  face.addColorStop(0, tone(v.shaft.light)); face.addColorStop(0.5, tone(v.shaft.mid)); face.addColorStop(1, tone(v.shaft.dark));
  ctx.fillStyle = face; ctx.fill();
  ctx.strokeStyle = rgba("#241c14", 0.7); ctx.lineWidth = 0.7; ctx.stroke();
  const [a, b] = [points[0]!, points[1]!];
  ctx.strokeStyle = tone(v.shaft.light); ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
}

/**
 * O que faz o Cajado de Rocha Viva (ADR 0073) parecer de terra: lascas de rocha que abraçam a gema (atrás dela), carocos de pedra e
 * rachaduras na haste, e (na frente) três cacos de pedra que giram devagar em volta da gema. `time` faz os cacos girarem.
 */
export function paintStoneMotif(ctx: CanvasRenderingContext2D, v: StaffVisualProfile, tone: StaffTone, time: number, layer: "back" | "front"): void {
  if (layer === "back") {
    slab(ctx, v, tone, [[-2.4, STAFF_TOP_Y + 1], [-6.6, STAFF_GEM_Y + 3], [-5.2, STAFF_GEM_Y - 4.6], [-2.8, STAFF_GEM_Y + 0.6]]);
    slab(ctx, v, tone, [[2.4, STAFF_TOP_Y + 1], [6.8, STAFF_GEM_Y + 2.4], [5.4, STAFF_GEM_Y - 5], [2.9, STAFF_GEM_Y + 0.4]]);
    // carocos de pedra na haste, com sombra e brilho
    for (const [x, y, r] of [[1, -9, 1.7], [-1, -17, 1.4], [0.8, 5, 1.2]] as const) {
      ellipse(ctx, x, y + 0.5, r, r * 0.8, tone(v.shaft.dark));
      ellipse(ctx, x - 0.2, y, r * 0.85, r * 0.7, tone(v.shaft.mid));
      ellipse(ctx, x - r * 0.3, y - r * 0.3, r * 0.4, r * 0.3, rgba(v.sheen, 0.8));
    }
    // musgo vivo sobre as lascas (a rocha é "viva")
    for (const [x, y, r] of [[-4.6, STAFF_GEM_Y - 1, 1.5], [4.8, STAFF_GEM_Y - 1.6, 1.3], [-3.4, STAFF_GEM_Y + 1.6, 1.0]] as const) {
      ellipse(ctx, x, y, r, r * 0.6, "#6f8f4e"); ellipse(ctx, x - r * 0.25, y - r * 0.2, r * 0.55, r * 0.3, "#a4c872");
    }
    // rachaduras, com luz âmbar saindo de dentro e três cristais cravados na pedra
    ctx.strokeStyle = rgba(v.gem.glow, 0.7); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-1.2, -21); ctx.lineTo(0.3, -19); ctx.lineTo(-0.6, -16.5); ctx.stroke();
    for (const [x, y] of [[-1.2, -13.6], [1.1, -5.2], [-0.8, 9.6]] as const) { ellipse(ctx, x, y, 0.9, 1.3, tone(v.gem.mid)); ellipse(ctx, x - 0.2, y - 0.3, 0.4, 0.6, tone(v.gem.light)); }
    ctx.strokeStyle = rgba("#241c14", 0.8); ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.moveTo(-1.2, -21); ctx.lineTo(0.3, -19); ctx.lineTo(-0.6, -16.5);
    ctx.moveTo(1, -3.4); ctx.lineTo(-0.4, -1); ctx.lineTo(0.8, 1.6);
    ctx.stroke();
    return;
  }
  // três cacos de pedra em órbita lenta; os de trás ficam menores
  for (let i = 0; i < 3; i++) {
    const a = time * 0.9 + (i * Math.PI * 2) / 3, depth = 0.8 + 0.2 * Math.sin(a);
    const x = Math.cos(a) * 8.6, y = STAFF_GEM_Y + Math.sin(a) * 3.4 - 1.2;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a * 1.3); ctx.scale(depth, depth);
    ctx.fillStyle = tone(i % 2 ? v.shaft.light : v.shaft.mid);
    ctx.beginPath(); ctx.moveTo(0, -1.8); ctx.lineTo(1.5, 0); ctx.lineTo(0, 1.8); ctx.lineTo(-1.3, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba("#241c14", 0.7); ctx.lineWidth = 0.5; ctx.stroke();
    ctx.restore();
  }
  ellipse(ctx, 0, STAFF_GEM_Y + 5.4, 3.6, 1.1, rgba(v.gem.glow, 0.35));
}
