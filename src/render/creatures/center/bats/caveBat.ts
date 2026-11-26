/**
 * Morcego de Caverna (Centro): corpo pequeno e peludo pendurado entre duas asas de membrana com dedos e borda recortada. As asas batem de verdade (o ritmo
 * vem do `time` e da passada), a boca abre no golpe (`casting`) e a membrana rasga quando a vida cai. Não decide acerto, dano nem saque.
 */
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";
import type { Palette } from "../../shared/southGeometry.ts";
import { renderWave3Frame } from "../../shared/wave3Frame.ts";
import { body, OUTLINE } from "../../shared/southGeometry.ts";
import { creatureMotion, type CreatureMotion } from "../../shared/creatureMotion.ts";
import { furAlong, furFlow } from "../../shared/anatomy/fur.ts";
import { clamp01, ellipse, rgba } from "../../../draw.ts";

export const CREATURE_PALETTE: Palette = { base: "#4c4058", light: "#a594b4", dark: "#1d1725", accent: "#c97488", eye: "#f2d36b", extra: "#6d5c7e" };
const MAX_HP = 24;

/** Uma asa: ombro no corpo, quatro dedos que abrem em leque e membrana de borda recortada entre as pontas. `lift` (−1 a 1) é o ponto do bater. */
function wing(ctx: CanvasRenderingContext2D, c: Palette, side: -1 | 1, lift: number, tear: number): void {
  const reach = 27 - Math.abs(lift) * 5;
  const tipY = -34 - lift * 15;
  const fingers: ReadonlyArray<readonly [number, number]> = [
    [side * reach, tipY], [side * (reach - 3), tipY + 11], [side * (reach - 10), tipY + 19], [side * (reach - 17), tipY + 24],
  ];
  const membrane = ctx.createLinearGradient(0, -34, side * reach, tipY + 10);
  membrane.addColorStop(0, c.extra); membrane.addColorStop(.6, c.base); membrane.addColorStop(1, c.dark);
  ctx.fillStyle = membrane; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(side * 3, -33);
  ctx.lineTo(fingers[0]![0], fingers[0]![1]);
  for (let i = 0; i < fingers.length - 1; i++) {
    const [ax, ay] = fingers[i]!, [bx, by] = fingers[i + 1]!;
    const rip = i === 1 ? tear * 3.5 : 0;
    ctx.quadraticCurveTo((ax + bx) / 2 - side * (3 + rip), (ay + by) / 2 - 3 + rip, bx, by);
  }
  ctx.quadraticCurveTo(side * 6, -21, side * 3, -27); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = c.light; ctx.lineWidth = 1.1; ctx.lineCap = "round";
  for (const [fx, fy] of fingers) { ctx.beginPath(); ctx.moveTo(side * 3, -32); ctx.lineTo(fx, fy); ctx.stroke(); }
  ctx.strokeStyle = rgba(c.accent, .4); ctx.lineWidth = .6;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(side * 4, -30 + i * 2); ctx.quadraticCurveTo(side * 12, -32 - lift * 6 + i * 3, fingers[i + 1]![0] * .85, fingers[i + 1]![1] + 1); ctx.stroke(); }
  ellipse(ctx, fingers[0]![0], fingers[0]![1], 1.5, 1.2, c.light);
  // o acabamento da asa: veias finas que ramificam entre os dedos e as juntas dos dedos (só curvas e discos: a borda da asa não muda)
  ctx.strokeStyle = rgba(c.dark, .45); ctx.lineWidth = .5;
  for (let i = 0; i < 3; i++) {
    const [ax, ay] = fingers[i]!, [bx, by] = fingers[i + 1]!;
    for (const t of [.35, .65]) { ctx.beginPath(); ctx.moveTo(side * 5, -29 + i * 2.4); ctx.bezierCurveTo(side * (6 + t * 8), ay * t + -31 * (1 - t), (ax + bx) / 2 * t + side * 4, (ay + by) / 2 - 1.6, ax * (1 - t) + bx * t, ay * (1 - t) + by * t); ctx.stroke(); }
  }
  for (const [fx, fy] of fingers) ellipse(ctx, side * 3 + (fx - side * 3) * .55, -32 + (fy + 32) * .55, 1, .85, rgba(c.light, .85));
}

/** Corpo peludo (mechas pelo peito e pela gola), pés pendurados com garras e cabeça de orelhas enormes com nervuras, focinho com folha nasal, olhos amarelos e presas. */
function bodyAndHead(ctx: CanvasRenderingContext2D, c: Palette, time: number, seed: number, bite: number, wound: number): void {
  const snap = clamp01(bite);
  for (const dx of [-3, 3]) {
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(dx, -20); ctx.lineTo(dx * 1.6, -14); ctx.stroke();
    ctx.strokeStyle = c.light; ctx.lineWidth = .8;
    for (let claw = -1; claw <= 1; claw++) { ctx.beginPath(); ctx.moveTo(dx * 1.6 + claw, -14); ctx.lineTo(dx * 1.6 + claw * 1.6, -11); ctx.stroke(); }
  }
  body(ctx, 0, -28, 8, 11, c);
  const fur = ctx.createRadialGradient(-2, -31, 1, 0, -28, 11);
  fur.addColorStop(0, rgba(c.light, .5)); fur.addColorStop(1, rgba(c.dark, 0));
  ellipse(ctx, 0, -28, 7, 10, fur);
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, -28, 7.6, 10.6, 0, 0, Math.PI * 2); ctx.clip();
  furFlow(ctx, { x0: -8, y0: -38, x1: 8, y1: -17 }, { seed: seed + 3, count: 34, length: 3.6, dx: 0, dy: 1, bend: .5, dark: c.dark, light: c.light, alpha: .5, width: .6 });
  const chest = ctx.createRadialGradient(0, -30, 1, 0, -28, 7); chest.addColorStop(0, rgba(c.light, .55)); chest.addColorStop(1, rgba(c.light, 0)); ctx.fillStyle = chest; ctx.fillRect(-8, -38, 16, 22);
  ctx.restore();
  furAlong(ctx, [[-7.6, -33], [-5.6, -38.4], [0, -39.8], [5.6, -38.4], [7.6, -33]], -1, { seed: seed + 9, count: 12, length: 2.6, sweep: 0, dark: c.dark, light: c.light, alpha: .75, width: .8 });
  furAlong(ctx, [[-7.6, -24], [-6.4, -19], [-3, -17.4]], 1, { seed: seed + 15, count: 4, length: 2, sweep: 0, dark: c.dark, light: c.light, alpha: .6, width: .7 });
  for (const side of [-1, 1]) {
    ctx.fillStyle = c.base; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(side * 2.5, -41); ctx.quadraticCurveTo(side * 9, -52, side * 8.2, -57); ctx.quadraticCurveTo(side * 3, -52, side * 1, -43); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c.accent; ctx.beginPath(); ctx.moveTo(side * 3, -43); ctx.quadraticCurveTo(side * 7.4, -50, side * 7.2, -54); ctx.quadraticCurveTo(side * 3.6, -50, side * 2, -44); ctx.closePath(); ctx.fill();
    // as nervuras da orelha, e o pelo fino da borda de dentro
    ctx.strokeStyle = rgba(c.dark, .5); ctx.lineWidth = .5;
    for (let r = 0; r < 3; r++) { ctx.beginPath(); ctx.moveTo(side * (2.8 + r * .3), -43.6); ctx.bezierCurveTo(side * (4.6 + r), -47, side * (5.6 + r * .8), -50, side * (6.4 + r * .4), -53.4 + r * 1.2); ctx.stroke(); }
    furAlong(ctx, [[side * 2.2, -43], [side * 5.4, -49]], 1, { seed: seed + 21 + side, count: 4, length: 1.6, sweep: 0, dark: c.light, light: "#e8dcec", alpha: .7, width: .5 });
  }
  body(ctx, 0, -42, 6.6, 6, c);
  furAlong(ctx, [[-6.2, -44], [-6.6, -41], [-4.8, -37.6]], 1, { seed: seed + 27, count: 4, length: 2, sweep: 0, dark: c.dark, light: c.light, alpha: .65, width: .6 });
  furAlong(ctx, [[6.2, -44], [6.6, -41], [4.8, -37.6]], 1, { seed: seed + 29, count: 4, length: 2, sweep: 0, dark: c.dark, light: c.light, alpha: .65, width: .6 });
  const blink = Math.sin(time * .8 + seed * 13) > .985;
  for (const side of [-1, 1]) {
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(side * 1.2, -46.2); ctx.lineTo(side * 4.8, -45.4 - snap * .4); ctx.stroke(); ctx.lineCap = "butt";
    if (blink) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(side * 3.6 - 1.4, -43); ctx.lineTo(side * 3.6 + 1.4, -43); ctx.stroke(); }
    else { ellipse(ctx, side * 3, -43.4, 1.9, 1.7, OUTLINE); ellipse(ctx, side * 3, -43.6, 1.3, 1.2, c.eye); ellipse(ctx, side * 3, -43.6, .35, .85, OUTLINE); ellipse(ctx, side * 2.7, -44.1, .4, .4, "#fff6dc"); }
  }
  // o focinho: a almofada clara, a folha nasal em cima do nariz e as narinas
  ellipse(ctx, 0, -39.4, 3.6, 2.5, rgba(c.extra, .8));
  ctx.fillStyle = c.accent; ctx.strokeStyle = OUTLINE; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(-1.8, -40.4); ctx.quadraticCurveTo(0, -43.4, 1.8, -40.4); ctx.quadraticCurveTo(0, -39.2, -1.8, -40.4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ellipse(ctx, 0, -39.6, 1.3, .9, c.accent);
  for (const dx of [-.7, .7]) ellipse(ctx, dx, -39.4, .3, .25, "#1b1019");
  ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.ellipse(0, -37.4, 2.6, .8 + snap * 2.4, 0, 0, Math.PI * 2); ctx.fill();
  if (snap > .3) ellipse(ctx, 0, -36.6 + snap * .6, 1.6, .7 + snap * .5, rgba("#c2384a", .85));
  if (snap > .02) {
    // o guincho: dois arcos de som saem da boca aberta
    ctx.strokeStyle = rgba(c.light, .3 + snap * .5); ctx.lineWidth = .8;
    for (const r of [4, 7]) { ctx.beginPath(); ctx.arc(0, -37, r + snap * 2, Math.PI * .25, Math.PI * .75); ctx.stroke(); }
  }
  ctx.fillStyle = "#f2ecd9";
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(side * 1.8, -38); ctx.lineTo(side * 1.2, -35 + snap * 2.4); ctx.lineTo(side * .6, -38); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(side * 1.4, -36.2 + snap * .6); ctx.lineTo(side * 1, -37.8 - snap * .4); ctx.lineTo(side * .5, -36.2 + snap * .6); ctx.closePath(); ctx.fill();
  }
  if (wound > .35) { ctx.strokeStyle = rgba("#8c3b4d", .4 + wound * .5); ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(-5, -33); ctx.lineTo(-2, -27); ctx.lineTo(-4, -22); ctx.stroke(); }
}

/** O Morcego de Caverna inteiro, sem moldura nem sombra: o bater é do relógio (paira parado), bate mais largo no voo e acompanha a passada, e ferido bate mais curto. */
export function drawCaveBat(ctx: CanvasRenderingContext2D, c: Palette, time: number, m: CreatureMotion): void {
  const lift = Math.sin(time * 8.5 + m.seed * 3 + m.phase * .5) * (.72 + m.moving * .28) * (1 - m.wound * .4);
  wing(ctx, c, -1, lift, m.wound);
  wing(ctx, c, 1, lift, m.wound);
  bodyAndHead(ctx, c, time, m.seed, m.bite, m.wound);
}

export function renderCaveBatCreature(ctx: CanvasRenderingContext2D, actor: RegionalCreatureVisual, sx: number, sy: number, time = 0): void {
  const motion = creatureMotion(actor, "cave-bat", MAX_HP);
  renderWave3Frame(ctx,actor,sx,sy,time,CREATURE_PALETTE, (surface, colors, t) => drawCaveBat(surface, colors, t, motion), 12);
}
