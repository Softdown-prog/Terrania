/**
 * Rato Gigante (Centro): pelo cinzento e emaranhado, orelhas e cauda rosadas, dentões de roedor. Anda arqueado, de focinho baixo; as patas seguem a passada
 * de verdade (`motionPhase`), a boca abre no golpe (`casting`) e a pelagem mostra arranhões quando a vida cai. Não decide acerto, dano nem saque.
 */
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";
import type { Palette } from "../../shared/southGeometry.ts";
import { renderWave3Frame } from "../../shared/wave3Frame.ts";
import { body, eye, line, tip, OUTLINE } from "../../shared/southGeometry.ts";
import { creatureMotion, type CreatureMotion } from "../../shared/creatureMotion.ts";
import { clamp01, ellipse, rgba } from "../../../draw.ts";

export const CREATURE_PALETTE: Palette = { base: "#7e7268", light: "#cbbfae", dark: "#3d362f", accent: "#d99c9a", eye: "#d4503e", extra: "#a29381" };
const MAX_HP = 28;

/** Cauda grossa e nua, em três gomos que acompanham o balanço da passada, com anéis de pele. */
function tail(ctx: CanvasRenderingContext2D, c: Palette, phase: number, moving: number, time: number): void {
  const sway = Math.sin(phase * 1.3) * 3 * moving + Math.sin(time * 1.4) * 1.1;
  const pts: ReadonlyArray<readonly [number, number]> = [[13, -13], [22, -10 + sway * .4], [30, -17 + sway * .8], [37, -13 + sway]];
  ctx.lineCap = "round";
  for (let i = 0; i < pts.length - 1; i++) {
    const [x, y] = pts[i]!, [nx, ny] = pts[i + 1]!;
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 5.4 - i * .9;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo((x + nx) / 2 + 1, (y + ny) / 2 + 3, nx, ny); ctx.stroke();
    ctx.strokeStyle = c.accent; ctx.lineWidth = 3.3 - i * .7; ctx.stroke();
    ctx.strokeStyle = rgba(c.dark, .55); ctx.lineWidth = .7;
    for (let ring = 0; ring < 3; ring++) {
      const t = (ring + .6) / 3.2, rx = x + (nx - x) * t, ry = y + (ny - y) * t + 1;
      ctx.beginPath(); ctx.moveTo(rx, ry - 1.6); ctx.lineTo(rx + .6, ry + 1.8); ctx.stroke();
    }
  }
  ellipse(ctx, 37, -13 + sway, 1.5, 1.1, rgba(c.light, .8));
}

/** Quatro patas: as de trás empurram (coxa grossa), as da frente arranham; cada uma com garras. */
function legs(ctx: CanvasRenderingContext2D, c: Palette, phase: number, moving: number): void {
  for (const [i, x] of ([[0, 8], [1, 12], [2, -9], [3, -13]] as const)) {
    const step = Math.sin(phase + (i % 2) * Math.PI) * moving;
    const hind = i < 2;
    if (hind) ellipse(ctx, x - 1, -8, 5.4, 6.4, c.dark);
    line(ctx, x, hind ? -8 : -9, x + step * 5 + (hind ? 2 : -2), -1 - Math.max(0, step) * 2, c, hind ? 3.4 : 2.8);
    ctx.strokeStyle = c.light; ctx.lineWidth = .7;
    for (let claw = -1; claw <= 1; claw++) {
      const fx = x + step * 5 + (hind ? 2 : -2) + claw * 1.7;
      ctx.beginPath(); ctx.moveTo(fx, -.6); ctx.lineTo(fx + (hind ? 1 : -1), 2.2); ctx.stroke();
    }
  }
}

/** Corpo arqueado, com um tufo de pelos duros no lombo e a barriga mais clara. */
function torso(ctx: CanvasRenderingContext2D, c: Palette, seed: number, breath: number): void {
  body(ctx, 2, -17 + breath * .4, 17, 10.5, c);
  const belly = ctx.createLinearGradient(0, -12, 0, -4);
  belly.addColorStop(0, rgba(c.light, 0)); belly.addColorStop(1, rgba(c.light, .55));
  ellipse(ctx, 3, -9.5, 13, 4.2, belly);
  for (let i = 0; i < 11; i++) {
    const t = i / 10, x = -10 + t * 22, y = -26 - Math.sin(t * Math.PI) * 3.5 + breath * .4;
    tip(ctx, x, y, 1.8 + (i % 3) * .3, 3.2 + ((i + Math.floor(seed * 7)) % 4) * .9, i % 3 === 0 ? c.light : c.extra);
  }
  ctx.strokeStyle = rgba(c.dark, .5); ctx.lineWidth = .8;
  for (let i = 0; i < 6; i++) {
    const x = -6 + i * 4.2;
    ctx.beginPath(); ctx.moveTo(x, -24); ctx.quadraticCurveTo(x - 2, -19, x - 1.5, -13); ctx.stroke();
  }
}

/** Cabeça de focinho comprido: orelhas redondas, olho miúdo e vermelho, nariz e dois dentões que aparecem mais quando morde. */
function head(ctx: CanvasRenderingContext2D, c: Palette, time: number, seed: number, bite: number, wound: number): void {
  const snap = clamp01(bite);
  body(ctx, -15, -20, 9.5, 7.8, c, -.12);
  ellipse(ctx, -24, -15.5, 6.2, 3.8, c.base, .2);
  for (const [x, y, r] of [[-17, -29, 4.6], [-9, -28, 4.1]] as const) {
    body(ctx, x, y, r, r * 1.15, { ...c, base: c.accent, light: c.light, dark: c.dark });
    ellipse(ctx, x, y + .6, r * .55, r * .75, rgba(c.dark, .55));
  }
  const blink = Math.sin(time * .9 + seed * 9) > .985;
  if (blink) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-18.4, -21); ctx.lineTo(-15.2, -21); ctx.stroke(); }
  else eye(ctx, -16.8, -21, c, 1.5);
  ellipse(ctx, -29.2, -16.4, 2.2, 1.7, c.accent);
  ellipse(ctx, -29.8, -16.9, .6, .5, rgba("#fff6e4", .9));
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = .9;
  ctx.beginPath(); ctx.moveTo(-28, -13.2); ctx.quadraticCurveTo(-22, -11.4 + snap * 3, -17, -13.8 + snap * 2); ctx.stroke();
  for (const dx of [0, 2.6]) {
    const x = -26.6 + dx;
    ctx.fillStyle = "#eadfbf"; ctx.strokeStyle = OUTLINE; ctx.lineWidth = .6;
    ctx.beginPath(); ctx.moveTo(x, -13.3); ctx.lineTo(x + .4, -8.8 + snap * 3); ctx.lineTo(x + 2.1, -13.3); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  if (snap > .02) {
    // o golpe: três riscos de movimento atrás da cabeça e um fio de baba nos dentões
    ctx.strokeStyle = rgba(c.light, .35 + snap * .5); ctx.lineWidth = .8;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-6 + k * 2.4, -30 + k * 4); ctx.quadraticCurveTo(-1 + k * 2, -31 + k * 4, 3 + k * 2, -30 + k * 4); ctx.stroke(); }
    ctx.strokeStyle = rgba("#e8f3ff", .5 + snap * .4); ctx.lineWidth = .6;
    ctx.beginPath(); ctx.moveTo(-25.4, -9); ctx.lineTo(-25.2, -6.2 - snap * 1.5); ctx.stroke();
  }
  for (const side of [-1, 1]) for (let w = 0; w < 3; w++) {
    const sway = Math.sin(time * 2.6 + w * .9) * .6;
    ctx.strokeStyle = rgba(w % 2 ? c.light : "#efe6d2", .85); ctx.lineWidth = .5;
    ctx.beginPath(); ctx.moveTo(-28.6, -16 + w * .8);
    ctx.bezierCurveTo(-33, -17 + side * 2.2, -37, -17 + side * (3.5 + w) + sway, -41 - w, -17 + side * (4.4 + w * 1.4) + sway); ctx.stroke();
  }
  if (wound > .35) {
    ctx.strokeStyle = rgba("#8c3b3d", .35 + wound * .55); ctx.lineWidth = 1;
    for (let s = 0; s < 3; s++) { ctx.beginPath(); ctx.moveTo(-14 + s * 3, -26); ctx.lineTo(-11 + s * 3, -20); ctx.stroke(); }
  }
}

/** O Rato Gigante inteiro, sem moldura nem sombra (quem chama põe a pose): `m` traz passada, golpe e ferimento (testável parte por parte). */
export function drawGiantRat(ctx: CanvasRenderingContext2D, c: Palette, time: number, m: CreatureMotion): void {
  const breath = Math.sin(time * 2 + m.seed * 5) * .6;
  tail(ctx, c, m.phase, m.moving, time);
  legs(ctx, c, m.phase, m.moving);
  torso(ctx, c, m.seed, breath);
  head(ctx, c, time, m.seed, m.bite, m.wound);
}

export function renderGiantRatCreature(ctx: CanvasRenderingContext2D, actor: RegionalCreatureVisual, sx: number, sy: number, time = 0): void {
  const motion = creatureMotion(actor, "giant-rat", MAX_HP);
  renderWave3Frame(ctx,actor,sx,sy,time,CREATURE_PALETTE, (surface, colors, t) => drawGiantRat(surface, colors, t, motion), 17);
}
