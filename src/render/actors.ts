import type { Player } from "../actors/Player.ts";
import type { Slime } from "../actors/Slime.ts";
import { CREATURE_CATALOG } from "../actors/CreatureCatalog.ts";
import { attackBody, swingTrail, swordSwing } from "./heroPose.ts";
import { blink, gait, slimePose, smoothTo } from "./animation.ts";
import { clamp01, ellipse, hashString, limb, mix, pill, rgba, smoothstep, softShadow, TAU } from "./draw.ts";

export type HeroVisual = Pick<
  Player,
  "faceX" | "faceY" | "walkTime" | "attackTime"
> &
  Partial<Pick<Player, "vx" | "vy" | "hurtTime" | "attackWeapon">> & { id?: string };
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

const PAL = {
  skin: "#e2bb91", skinD: "#b98a64", skinL: "#f3d6b2",
  hair: "#4a382b", hairD: "#2f241c", hairL: "#7f6044",
  band: "#8a6c45", bandL: "#d4bc7f",
  tunic: "#4e7681", tunicL: "#79a3a8", tunicD: "#2f5663",
  leather: "#6d5238", leatherL: "#a98859", leatherD: "#3f2f22",
  pants: "#2c3f48", boots: "#4c3a2d", bootsL: "#7a5c40",
  capeT: "#2f5d6a", capeB: "#16303a",
  steel: "#d4ddd1", steelD: "#8c9b98", gold: "#d9bf7c",
  outline: "#142a2a",
};

function weaponGlint(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number): void {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = "#fffbe6";
  ctx.beginPath();
  ctx.moveTo(x, y - size); ctx.lineTo(x + size * 0.22, y - size * 0.22);
  ctx.lineTo(x + size, y); ctx.lineTo(x + size * 0.22, y + size * 0.22);
  ctx.lineTo(x, y + size); ctx.lineTo(x - size * 0.22, y + size * 0.22);
  ctx.lineTo(x - size, y); ctx.lineTo(x - size * 0.22, y - size * 0.22);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

interface WeaponFrame { ox: number; oy: number; rot: number; attacking: boolean; hand: number }
function weaponFrame(player: HeroVisual): WeaponFrame {
  const attacking = player.attackTime > 0;
  const hand = player.faceX < -0.3 ? -1 : 1;
  if (attacking) {
    const pose = swordSwing(player.attackTime, player.attackWeapon);
    return { ox: 0, oy: -12, rot: Math.atan2(player.faceY, player.faceX) + pose.angle, attacking, hand };
  }
  const tilt = player.faceY < -0.35 ? -0.95 : 0.95;
  return { ox: hand * 9, oy: -9, rot: hand < 0 ? Math.PI - tilt : tilt, attacking, hand };
}

/** Rastro em forma de crescente atrás da lâmina durante a varredura. */
function renderTrail(ctx: CanvasRenderingContext2D, player: HeroVisual, forge: boolean): void {
  const trail = swingTrail(player.attackTime, player.attackWeapon);
  if (trail.alpha <= 0.02 || trail.angles.length < 2) return;
  const facing = Math.atan2(player.faceY, player.faceX);
  const inner = 20, outer = 44;
  const col = forge ? "#ffb066" : "#fff3c8";
  ctx.save();
  ctx.translate(0, -12);
  for (let pass = 0; pass < 2; pass++) {
    const r1 = pass ? 32 : inner;
    ctx.beginPath();
    trail.angles.forEach((a, i) => {
      const x = Math.cos(facing + a) * outer, y = Math.sin(facing + a) * outer;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    for (let i = trail.angles.length - 1; i >= 0; i--) {
      const a = (trail.angles[i] ?? 0) + facing;
      ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
    }
    ctx.closePath();
    ctx.fillStyle = rgba(col, trail.alpha * (pass ? 0.5 : 0.22));
    ctx.fill();
  }
  ctx.strokeStyle = rgba("#ffffff", trail.alpha * 0.85);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  trail.angles.forEach((a, i) => {
    const x = Math.cos(facing + a) * outer, y = Math.sin(facing + a) * outer;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.restore();
}

function renderWeapon(ctx: CanvasRenderingContext2D, frame: WeaponFrame, player: HeroVisual,
  tone: (c: string) => string, impact: number): void {
  const forge = player.attackWeapon === "forge";
  const len = frame.attacking ? 45 : 33;
  ctx.save();
  ctx.translate(frame.ox, frame.oy);
  ctx.rotate(frame.rot);
  // Cabo com empunhadura trançada e pomo.
  ctx.fillStyle = tone(PAL.leatherD);
  ctx.fillRect(4, -2.1, 9, 4.2);
  ctx.fillStyle = tone(PAL.leather);
  for (let i = 0; i < 4; i++) ctx.fillRect(5 + i * 2.2, -2.1, 1.2, 4.2);
  ellipse(ctx, 3.2, 0, 2.3, 2.5, tone(forge ? "#e2a24f" : PAL.gold));
  // Guarda.
  ctx.fillStyle = tone(forge ? "#e2a24f" : PAL.gold);
  ctx.fillRect(12, -6.4, 3, 12.8);
  ctx.fillStyle = tone(forge ? "#fff0b8" : "#f3e3a8");
  ctx.fillRect(12, -6.4, 1, 12.8);
  // Lâmina em duas faces com friso central.
  const blade = ctx.createLinearGradient(15, 0, len, 0);
  if (forge) {
    blade.addColorStop(0, "#e4e0cf"); blade.addColorStop(0.55, "#efb26a"); blade.addColorStop(1, "#ff7c35");
  } else {
    blade.addColorStop(0, "#c8d2cf"); blade.addColorStop(1, "#f1f5ea");
  }
  ctx.fillStyle = tone(PAL.steelD);
  ctx.beginPath();
  ctx.moveTo(15, -3.4); ctx.lineTo(len - 7, -2.7); ctx.lineTo(len, 0);
  ctx.lineTo(len - 7, 2.7); ctx.lineTo(15, 3.4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = blade;
  ctx.beginPath();
  ctx.moveTo(15, -3.1); ctx.lineTo(len - 7, -2.4); ctx.lineTo(len, 0); ctx.lineTo(15, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba("#6f7f7e", 0.7);
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(17, 0); ctx.lineTo(len - 6, 0); ctx.stroke();
  ctx.strokeStyle = rgba("#ffffff", 0.9);
  ctx.beginPath(); ctx.moveTo(16, -2.6); ctx.lineTo(len - 8, -2.1); ctx.stroke();
  if (forge && frame.attacking) {
    const glow = ctx.createRadialGradient(len - 4, 0, 1, len - 4, 0, 14);
    glow.addColorStop(0, "rgba(255,160,70,.55)"); glow.addColorStop(1, "rgba(255,120,40,0)");
    ctx.fillStyle = glow; ctx.fillRect(len - 18, -14, 28, 28);
  }
  weaponGlint(ctx, len - 12, -1, 5 * impact + 1.6 * (frame.attacking ? 1 : 0), impact);
  ctx.restore();
}

/** Perna: quadril → joelho → tornozelo, bota por cima. Desenhada em pares ordenados por profundidade. */
function drawLeg(ctx: CanvasRenderingContext2D, hipX: number, footX: number, footY: number,
  lift: number, mvx: number, tone: (c: string) => string, front: number): void {
  const hipY = -11.5;
  const kneeX = (hipX + footX) / 2 + mvx * lift * 0.5;
  const kneeY = (hipY + footY) / 2 - lift * 0.35;
  limb(ctx, hipX, hipY, kneeX, kneeY, 5, tone(PAL.pants));
  limb(ctx, kneeX, kneeY, footX, footY - 2.4, 4.4, tone(mix(PAL.pants, "#000000", 0.12)));
  // cano da bota e cadarço
  ctx.fillStyle = tone(PAL.boots);
  ctx.fillRect(footX - 2.6, footY - 5.2, 5.2, 4);
  ctx.fillStyle = tone(PAL.bootsL);
  ctx.fillRect(footX - 2.6, footY - 5.4, 5.2, 1.3);
  ellipse(ctx, footX + mvx * 1.6, footY - 0.8 + front * 0.5, 4.4, 2.5, tone(PAL.boots));
  ellipse(ctx, footX + mvx * 1.6 - 0.6, footY - 1.5, 2.4, 1, rgba("#ffffff", 0.16));
}

function drawArm(ctx: CanvasRenderingContext2D, sx: number, sy: number, hx: number, hy: number,
  tone: (c: string) => string, sleeve: string): void {
  limb(ctx, sx, sy, hx, hy, 4.6, tone(sleeve));
  limb(ctx, (sx + hx) / 2, (sy + hy) / 2, hx, hy, 4.7, tone(PAL.leatherD));
  ellipse(ctx, hx, hy, 2.4, 2.4, tone(PAL.skin));
  ellipse(ctx, hx - 0.6, hy - 0.6, 1, 1, rgba("#ffffff", 0.3));
}

/**
 * Herói completo: ciclo de passos com joelhos e pés levantados, balanço de
 * braços, capa e rabo-de-cavalo com inércia, respiração parada, recuo e avanço
 * do corpo no golpe, piscadas e rosto direcional. `time` é opcional (prévias
 * estáticas omitem e ficam em pose congelada).
 */
export function renderHero(
  ctx: CanvasRenderingContext2D,
  player: HeroVisual,
  sx: number,
  sy: number,
  time?: number,
): void {
  const id = player.id ?? "self";
  const seed = hashString(id);
  const t = time ?? 0;
  const vxRaw = player.vx ?? player.faceX * 70, vyRaw = player.vy ?? player.faceY * 70;
  const speed = Math.hypot(vxRaw, vyRaw);
  const moving = smoothTo("hero-m:" + id, smoothstep(speed / 70), time, 16);
  const mvx = speed > 1 ? vxRaw / speed : player.faceX;
  const mvy = speed > 1 ? vyRaw / speed : player.faceY;
  const g = gait(player.walkTime, moving);
  const atk = attackBody(player.attackTime, player.attackWeapon);
  const hurt = clamp01((player.hurtTime ?? 0) / 0.3);
  const flash = clamp01(((player.hurtTime ?? 0) - 0.14) / 0.06);
  const tone = (c: string): string => (flash > 0.02 ? mix(c, "#fff3dc", flash * 0.78) :
    hurt > 0 ? mix(c, "#d9674a", hurt * 0.16) : c);
  const idle = 1 - g.moving;
  const breath = Math.sin(t * 2.3 + seed * 6) * idle;
  const back = player.faceY < -0.35;
  const side = player.faceX > 0.3 ? 1 : player.faceX < -0.3 ? -1 : 0;
  const prof = Math.abs(player.faceX) * (1 - Math.abs(player.faceY) * 0.55);
  const wf = 1 - 0.2 * prof;
  const dirX = Math.cos(Math.atan2(player.faceY, player.faceX));
  const frame = weaponFrame(player);

  ctx.save();
  ctx.translate(
    sx + player.faceX * atk.lunge * 3.4 - player.faceX * hurt * 2.4,
    sy + player.faceY * atk.lunge * 2.2 - player.faceY * hurt * 1.4,
  );
  const lift = Math.max(g.a.lift, g.b.lift);
  softShadow(ctx, 1, 3.5, 12.5 - lift * 0.5 + Math.abs(atk.lunge) * 2, 4.6, 0.36);
  ctx.translate(0, g.bob + breath * 0.45);
  ctx.lineJoin = "round";

  if (back) renderWeapon(ctx, frame, player, tone, atk.impact);

  // --- pernas, ordenadas por profundidade -------------------------------
  const leftFoot = { hip: -3.6 * wf, x: -3.6 * wf + g.a.along * mvx, y: g.a.along * mvy * 0.55 - g.a.lift, lift: g.a.lift };
  const rightFoot = { hip: 3.6 * wf, x: 3.6 * wf + g.b.along * mvx, y: g.b.along * mvy * 0.55 - g.b.lift, lift: g.b.lift };
  const legs = leftFoot.y + g.a.lift <= rightFoot.y + g.b.lift ? [leftFoot, rightFoot] : [rightFoot, leftFoot];
  legs.forEach((leg, i) => drawLeg(ctx, leg.hip, leg.x, leg.y, leg.lift, mvx, tone, i));

  // --- capa (por baixo do tronco de frente; sobre ele de costas) ----------
  const trailX = -mvx * g.moving * 5 + Math.sin(t * 2.1 + seed * 5) * (0.7 + g.moving * 0.5) +
    Math.cos(player.walkTime * 2) * g.moving * 1.3 - dirX * atk.lunge * 1.5;
  const trailY = -mvy * g.moving * 2.2 + Math.max(0, mvy) * -g.moving;
  const drawCape = (): void => {
    const cape = ctx.createLinearGradient(0, -25, 0, -2);
    cape.addColorStop(0, tone(PAL.capeT)); cape.addColorStop(1, tone(PAL.capeB));
    ctx.fillStyle = cape;
    ctx.beginPath();
    ctx.moveTo(-8.6 * wf, -24.5);
    ctx.lineTo(8.6 * wf, -24.5);
    ctx.quadraticCurveTo(11 * wf + trailX * 0.5, -12, 11.5 * wf + trailX, -3 + trailY);
    ctx.quadraticCurveTo(trailX * 0.9, -0.5 + trailY + Math.sin(player.walkTime * 2) * g.moving, -11.5 * wf + trailX, -3 + trailY);
    ctx.quadraticCurveTo(-11 * wf + trailX * 0.5, -12, -8.6 * wf, -24.5);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba("#000000", 0.18);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-3, -22); ctx.quadraticCurveTo(-4 + trailX * 0.4, -12, -4.5 + trailX * 0.9, -3 + trailY);
    ctx.moveTo(3.5, -22); ctx.quadraticCurveTo(4.5 + trailX * 0.4, -12, 5 + trailX * 0.9, -3 + trailY);
    ctx.stroke();
    ctx.strokeStyle = rgba(PAL.outline, 0.4);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8.6 * wf, -24.5);
    ctx.quadraticCurveTo(-11 * wf + trailX * 0.5, -12, -11.5 * wf + trailX, -3 + trailY);
    ctx.moveTo(8.6 * wf, -24.5);
    ctx.quadraticCurveTo(11 * wf + trailX * 0.5, -12, 11.5 * wf + trailX, -3 + trailY);
    ctx.stroke();
  };
  if (!back) drawCape();

  // --- tronco (inclinado na direção do movimento e do golpe) ------------
  ctx.save();
  ctx.translate(0, -12);
  ctx.rotate(mvx * g.lean + dirX * atk.lunge * 0.13 + Math.sin(player.walkTime) * g.moving * 0.035);
  ctx.scale(1 + breath * 0.012, 1 - breath * 0.02);
  ctx.translate(0, 12);
  const body = ctx.createLinearGradient(-9 * wf, 0, 9 * wf, 0);
  body.addColorStop(0, tone(PAL.tunicL)); body.addColorStop(0.45, tone(PAL.tunic)); body.addColorStop(1, tone(PAL.tunicD));
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-7.5 * wf, -25);
  ctx.quadraticCurveTo(0, -27, 7.5 * wf, -25);
  ctx.lineTo(8.6 * wf, -12);
  ctx.lineTo(9.6 * wf, -7.4);
  ctx.quadraticCurveTo(5 * wf, -5.6 - g.a.lift * 0.1, 0, -7);
  ctx.quadraticCurveTo(-5 * wf, -5.6, -9.6 * wf, -7.4);
  ctx.lineTo(-8.6 * wf, -12);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba(PAL.outline, 0.5); ctx.lineWidth = 1; ctx.stroke();
  if (back) {
    ctx.fillStyle = rgba("#000000", 0.18);
    ctx.fillRect(-0.6, -24, 1.2, 12);
  } else {
    // costura, gola em V e brilho no peito
    ctx.strokeStyle = rgba("#17313a", 0.45); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(side * 1.4, -22); ctx.lineTo(side * 1.4, -13); ctx.stroke();
    ctx.fillStyle = tone(PAL.leather);
    ctx.beginPath(); ctx.moveTo(-4.4 * wf, -25.2); ctx.lineTo(4.4 * wf, -25.2); ctx.lineTo(side * 0.8, -20.6); ctx.closePath(); ctx.fill();
    ellipse(ctx, -3 * wf, -19, 2.4, 4.2, rgba("#ffffff", 0.14), -0.2);
  }
  // cinto, fivela e bolsa
  ctx.fillStyle = tone(PAL.leather);
  ctx.fillRect(-9.2 * wf, -13.3, 18.4 * wf, 3.4);
  ctx.fillStyle = tone(PAL.leatherL);
  ctx.fillRect(-9.2 * wf, -13.3, 18.4 * wf, 1);
  if (!back) {
    ctx.fillStyle = tone(PAL.bandL);
    ctx.fillRect(side * 1.4 - 1.8, -13.6, 3.6, 4);
    ctx.fillStyle = tone(PAL.leatherD);
    ctx.fillRect(side * 1.4 - 0.8, -12.6, 1.6, 2);
    ellipse(ctx, -frame.hand * 8.2 * wf, -8.4, 2.6, 3, tone(PAL.leather));
  }
  // ombreiras de couro
  for (const s of [-1, 1]) {
    ellipse(ctx, s * 8.3 * wf, -23.6, 3.8, 3, tone(PAL.leather));
    ellipse(ctx, s * 8.3 * wf - 0.6, -24.4, 2, 1.2, tone(PAL.leatherL));
  }
  ctx.restore();

  // --- braços --------------------------------------------------------------
  const swing = g.armSwing;
  const swordSide = frame.hand;
  for (const s of [-1, 1]) {
    if (s === swordSide) continue; // o braço da espada é desenhado junto da arma
    const hx = s * 9.6 * wf + mvx * swing * -s * 4.2;
    const hy = -12.5 + mvy * swing * -s * 2.8 - swing * -s * 1.2 + breath * 0.3;
    drawArm(ctx, s * 8.6 * wf, -22.6, hx, hy, tone, PAL.tunic);
  }
  const gripX = frame.ox + Math.cos(frame.rot) * 9, gripY = frame.oy + Math.sin(frame.rot) * 9;
  const swordArm = (): void => {
    limb(ctx, swordSide * 8.6 * wf, -22.6, gripX, gripY, 4.6, tone(PAL.tunic));
    limb(ctx, (swordSide * 8.6 * wf + gripX) / 2, (-22.6 + gripY) / 2, gripX, gripY, 4.7, tone(PAL.leatherD));
  };

  // --- cabeça --------------------------------------------------------------
  const headX = player.faceX * 1.3, headY = -31.5 + breath * 0.35 + Math.abs(Math.cos(player.walkTime)) * g.moving * -0.4 +
    atk.lunge * 0.8;
  if (back) drawCape();
  if (!back) { swordArm(); renderWeapon(ctx, frame, player, tone, atk.impact); ellipse(ctx, gripX, gripY, 2.6, 2.6, tone(PAL.skin)); }
  const tailDir = side !== 0 ? -side : 1;
  const tailSway = Math.sin(t * 2.4 + seed * 4) * 0.8 + Math.sin(player.walkTime * 2) * g.moving * 2.4 - mvx * g.moving * 3;
  // rabo-de-cavalo/mecha traseira
  ctx.strokeStyle = tone(PAL.hair); ctx.lineWidth = 4.2; ctx.lineCap = "round";
  ctx.beginPath();
  if (back) {
    ctx.moveTo(headX, headY + 3);
    ctx.quadraticCurveTo(headX + tailSway * 0.5, headY + 9, headX + tailSway, headY + 15);
  } else {
    ctx.moveTo(headX + tailDir * 6.6, headY - 1.5);
    ctx.quadraticCurveTo(headX + tailDir * (10 + Math.abs(tailSway) * 0.2) + tailSway * 0.4, headY + 1, headX + tailDir * 9 + tailSway, headY + 8);
  }
  ctx.stroke();
  ctx.strokeStyle = tone(PAL.hairL); ctx.lineWidth = 1.1;
  ctx.beginPath();
  if (back) { ctx.moveTo(headX - 1, headY + 4); ctx.quadraticCurveTo(headX - 1 + tailSway * 0.5, headY + 9, headX + tailSway - 1, headY + 14); }
  else { ctx.moveTo(headX + tailDir * 7, headY - 2); ctx.quadraticCurveTo(headX + tailDir * 10.5 + tailSway * 0.4, headY, headX + tailDir * 9.5 + tailSway, headY + 6); }
  ctx.stroke(); ctx.lineCap = "butt";

  // cabelo base e rosto
  const hairG = ctx.createRadialGradient(headX - 3, headY - 5, 1, headX, headY, 11);
  hairG.addColorStop(0, tone(PAL.hairL)); hairG.addColorStop(0.5, tone(PAL.hair)); hairG.addColorStop(1, tone(PAL.hairD));
  ellipse(ctx, headX, headY, 8.9, 9.2, hairG);
  if (!back) {
    const face = ctx.createRadialGradient(headX - 2 + side, headY - 2, 1, headX, headY + 1, 8.5);
    face.addColorStop(0, tone(PAL.skinL)); face.addColorStop(0.7, tone(PAL.skin)); face.addColorStop(1, tone(PAL.skinD));
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.moveTo(headX - 7 + side * 1.4, headY - 3.2);
    ctx.quadraticCurveTo(headX, headY - 6.2, headX + 7 + side * 1.4, headY - 3.2);
    ctx.quadraticCurveTo(headX + 8.2 + side * 1.2, headY + 3.6, headX + 3.4 + side, headY + 8.2);
    ctx.quadraticCurveTo(headX + side * 0.6, headY + 9.3, headX - 3.4 + side, headY + 8.2);
    ctx.quadraticCurveTo(headX - 8.2 + side * 1.2, headY + 3.6, headX - 7 + side * 1.4, headY - 3.2);
    ctx.closePath(); ctx.fill();
    const eyeY = headY + 0.3 + player.faceY * 0.7;
    const closed = Math.max(blink(t, seed * 10), hurt > 0.4 ? 0.85 : 0);
    const eyes = side === 0 ? [-3.1, 3.1] : [side * 3.8];
    for (const ex of eyes) {
      const x = headX + ex + side * 1.2;
      ellipse(ctx, x, eyeY, 1.9, 2.3 * (1 - closed) + 0.25, "#f6f1e3");
      ellipse(ctx, x + player.faceX * 0.6, eyeY + player.faceY * 0.5, 1.15, 1.6 * (1 - closed) + 0.2, "#1f3535");
      if (closed < 0.5) ellipse(ctx, x + 0.4, eyeY - 0.7, 0.45, 0.45, "#ffffff");
      ctx.strokeStyle = rgba(PAL.hairD, 0.9); ctx.lineWidth = 0.9;
      const fierce = player.attackTime > 0 ? 0.8 : 0;
      ctx.beginPath(); ctx.moveTo(x - 2.2, eyeY - 3.2 + fierce * (ex < 0 ? -1 : 1)); ctx.lineTo(x + 2.2, eyeY - 3.4 + fierce * (ex < 0 ? 1 : -1)); ctx.stroke();
    }
    if (side !== 0) ellipse(ctx, headX + side * 7, headY + 2.5, 1.2, 1.5, tone(PAL.skinD));
    ellipse(ctx, headX - 4.6 + side * 1.4, headY + 4, 1.8, 1, rgba("#d9806a", 0.28));
    ellipse(ctx, headX + 4.6 + side * 1.4, headY + 4, 1.8, 1, rgba("#d9806a", 0.28));
    ctx.fillStyle = tone("#6b4535");
    if (player.attackTime > 0 || hurt > 0.4) ellipse(ctx, headX + side * 1.8, headY + 6, 1.6, 1.2 + (hurt > 0.4 ? 0.6 : 0), tone("#5a2f2a"));
    else ctx.fillRect(headX + side * 1.8 - 1.3, headY + 5.6, 2.6, 0.9);
    // franja de cabelo
    ctx.fillStyle = tone(PAL.hair);
    ctx.beginPath();
    ctx.moveTo(headX - 9, headY - 1);
    ctx.quadraticCurveTo(headX - 9.6, headY - 9.6, headX - 1, headY - 10);
    ctx.quadraticCurveTo(headX + 8, headY - 9.8, headX + 9, headY - 1);
    ctx.quadraticCurveTo(headX + 6.4, headY - 4.8 + side * 0.6, headX + 3 + side, headY - 5.2);
    ctx.quadraticCurveTo(headX + 1 + side, headY - 2.8, headX - 1.8 + side, headY - 5.4);
    ctx.quadraticCurveTo(headX - 5.5, headY - 3, headX - 9, headY - 1);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = tone(PAL.hairL); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(headX - 6.5, headY - 7.6); ctx.quadraticCurveTo(headX - 2, headY - 9.8, headX + 3, headY - 8.6); ctx.stroke();
  } else {
    ctx.strokeStyle = tone(PAL.hairL); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(headX - 5, headY - 6); ctx.quadraticCurveTo(headX, headY - 8.6, headX + 4, headY - 6.4); ctx.stroke();
    ctx.strokeStyle = rgba("#000000", 0.2);
    ctx.beginPath(); ctx.moveTo(headX, headY - 2); ctx.lineTo(headX, headY + 7); ctx.stroke();
  }
  // faixa de cabeça com nó
  ctx.fillStyle = tone(PAL.band);
  ctx.beginPath();
  ctx.moveTo(headX - 8.7, headY - 4.8); ctx.quadraticCurveTo(headX, headY - 8.8, headX + 8.7, headY - 4.8);
  ctx.lineTo(headX + 8.9, headY - 2.6); ctx.quadraticCurveTo(headX, headY - 6.6, headX - 8.9, headY - 2.6);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = tone(PAL.bandL);
  ctx.fillRect(headX - 5.5, headY - 7.2, 4, 1);
  if (back) {
    ctx.strokeStyle = tone(PAL.band); ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(headX + 4.6, headY - 3.4);
    ctx.quadraticCurveTo(headX + 8 + tailSway * 0.3, headY, headX + 8 + tailSway * 0.7, headY + 3.2);
    ctx.stroke();
  }
  if (back) { swordArm(); }
  if (back) { ellipse(ctx, gripX, gripY, 2.4, 2.4, tone(PAL.skin)); }
  // Rastro e brilho por cima de tudo para ler bem em qualquer direção.
  renderTrail(ctx, player, player.attackWeapon === "forge");
  ctx.restore();
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
