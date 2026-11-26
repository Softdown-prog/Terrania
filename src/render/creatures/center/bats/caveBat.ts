/**
 * Morcego de Caverna (Centro): corpo pequeno e peludo pendurado entre duas asas de membrana com dedos e borda recortada. As asas batem de verdade (o ritmo
 * vem do `time` e da passada), a boca abre no golpe (`casting`) e a membrana rasga quando a vida cai. Não decide acerto, dano nem saque.
 */
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";
import type { Palette } from "../../shared/southGeometry.ts";
import { renderWave3Frame } from "../../shared/wave3Frame.ts";
import { body, OUTLINE } from "../../shared/southGeometry.ts";
import { creatureMotion, type CreatureMotion } from "../../shared/creatureMotion.ts";
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
}

/** Corpo peludo, pés pendurados com garras e cabeça de orelhas enormes, olhos amarelos e presas finas. */
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
  ctx.strokeStyle = rgba(c.dark, .6); ctx.lineWidth = .6;
  for (let i = 0; i < 7; i++) { const y = -33 + i * 2.2; ctx.beginPath(); ctx.moveTo(-5 + (i % 2), y); ctx.lineTo(-2.6, y + 1.8); ctx.moveTo(5 - (i % 2), y); ctx.lineTo(2.6, y + 1.8); ctx.stroke(); }
  for (const side of [-1, 1]) {
    ctx.fillStyle = c.base; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(side * 2.5, -41); ctx.quadraticCurveTo(side * 9, -52, side * 8.2, -57); ctx.quadraticCurveTo(side * 3, -52, side * 1, -43); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c.accent; ctx.beginPath(); ctx.moveTo(side * 3, -43); ctx.quadraticCurveTo(side * 7.4, -50, side * 7.2, -54); ctx.quadraticCurveTo(side * 3.6, -50, side * 2, -44); ctx.closePath(); ctx.fill();
  }
  body(ctx, 0, -42, 6.6, 6, c);
  const blink = Math.sin(time * .8 + seed * 13) > .985;
  for (const side of [-1, 1]) {
    if (blink) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(side * 3.6 - 1.4, -43); ctx.lineTo(side * 3.6 + 1.4, -43); ctx.stroke(); }
    else { ellipse(ctx, side * 3, -43.4, 1.9, 1.7, OUTLINE); ellipse(ctx, side * 3, -43.6, 1.3, 1.2, c.eye); ellipse(ctx, side * 2.7, -44.1, .4, .4, "#fff6dc"); }
  }
  ellipse(ctx, 0, -39.6, 1.8, 1.2, c.accent);
  ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.ellipse(0, -37.4, 2.6, .8 + snap * 2.4, 0, 0, Math.PI * 2); ctx.fill();
  if (snap > .02) {
    // o guincho: dois arcos de som saem da boca aberta
    ctx.strokeStyle = rgba(c.light, .3 + snap * .5); ctx.lineWidth = .8;
    for (const r of [4, 7]) { ctx.beginPath(); ctx.arc(0, -37, r + snap * 2, Math.PI * .25, Math.PI * .75); ctx.stroke(); }
  }
  ctx.fillStyle = "#f2ecd9";
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * 1.8, -38); ctx.lineTo(side * 1.2, -35 + snap * 2.4); ctx.lineTo(side * .6, -38); ctx.closePath(); ctx.fill(); }
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
