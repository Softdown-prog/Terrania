import { drawKnightSword, drawKnightTrail } from "./swords.ts";
import type { Player } from "../actors/Player.ts";
import type { GearState } from "../engine/character/Equipment.ts";
import type { WeaponId } from "../engine/character/Weapons.ts";
import { attackBody, swordMount, swingTrail, type SwordMountFrame } from "./heroPose.ts";
import { blink, gait, smoothTo } from "./animation.ts";
import { clamp01, ellipse, hashString, limb, mix, rgba, smoothstep, softShadow } from "./draw.ts";

export type HeroVisual = Pick<
  Player,
  "faceX" | "faceY" | "walkTime" | "attackTime"
> &
  Partial<Pick<Player, "vx" | "vy" | "hurtTime" | "attackWeapon">> &
  { id?: string; gear?: GearState | undefined; equippedWeapon?: WeaponId | undefined };

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

/** Rastro em forma de crescente atrás da lâmina durante a varredura. */
/** The strike and weapon use exactly the equipped tier from the shared sword catalog. */
function renderTrail(ctx: CanvasRenderingContext2D, player: HeroVisual, frame: SwordMountFrame): void {
  const weapon = player.attackWeapon ?? "starter";
  const trail = swingTrail(player.attackTime,weapon);
  if (!trail.angles.length || trail.alpha <= 0) return;
  // Rastro, mão e espada compartilham âncora e escala.
  ctx.save();
  ctx.translate(frame.gripX, frame.gripY);
  ctx.scale(frame.scale, frame.scale);
  drawKnightTrail(ctx,weapon,Math.atan2(player.faceY,player.faceX),trail.angles,trail.alpha);
  ctx.restore();
}

function renderWeapon(ctx: CanvasRenderingContext2D, frame: SwordMountFrame, player: HeroVisual,
  tone: (c: string) => string, impact: number, time: number): void {
  const weapon=frame.attacking ? player.attackWeapon ?? "starter" :
    player.equippedWeapon ?? player.attackWeapon ?? "starter";
  ctx.save();ctx.translate(frame.ox,frame.oy);ctx.rotate(frame.rot);
  ctx.scale(frame.scale, frame.scale);
  drawKnightSword(ctx,weapon,impact,tone,time);
  ctx.restore();
}

/** Perna: quadril → joelho → tornozelo, bota por cima. Desenhada em pares ordenados por profundidade. */
function drawLeg(ctx: CanvasRenderingContext2D, hipX: number, footX: number, footY: number,
  lift: number, mvx: number, tone: (c: string) => string, front: number,
  armoredBoots = false, armoredLegs = false): void {
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
  if (armoredLegs) {
    ellipse(ctx, kneeX, kneeY + 1, 3.1, 2.4, tone("#6e8582"));
    ctx.fillStyle = tone("#b4c8bf"); ctx.fillRect(kneeX - 1.8, kneeY + 0.2, 3.6, 0.9);
  }
  if (armoredBoots) {
    // A chapa acompanha o tornozelo calculado pela passada; não anima separada do pé.
    ctx.fillStyle = tone("#91aaa5");
    ctx.fillRect(footX - 2.7, footY - 5.1, 5.4, 3.7);
    ctx.fillStyle = tone("#e4e6c8");
    ctx.fillRect(footX - 2.1, footY - 5, 2.5, 0.9);
    ellipse(ctx, footX + mvx * 1.6, footY - 0.7 + front * 0.5,
      4.2, 1.4, tone("#748f87"));
  }
}

function drawArm(ctx: CanvasRenderingContext2D, sx: number, sy: number, hx: number, hy: number,
  tone: (c: string) => string, sleeve: string): void {
  limb(ctx, sx, sy, hx, hy, 4.6, tone(sleeve));
  limb(ctx, (sx + hx) / 2, (sy + hy) / 2, hx, hy, 4.7, tone(PAL.leatherD));
  ellipse(ctx, hx, hy, 2.4, 2.4, tone(PAL.skin));
  ellipse(ctx, hx - 0.6, hy - 0.6, 1, 1, rgba("#ffffff", 0.3));
}

/** Escudo do salgueiro no antebraço oposto à espada, acompanhando sua oscilação. */
function drawShield(ctx: CanvasRenderingContext2D, x: number, y: number, side: number,
  swing: number, tone: (c: string) => string): void {
  ctx.save();
  ctx.translate(x, y - 2);
  ctx.rotate(side * (0.14 + swing * 0.025));
  const wood = ctx.createLinearGradient(-6, -10, 6, 8);
  wood.addColorStop(0, tone("#a5beab")); wood.addColorStop(1, tone("#577e70"));
  ctx.fillStyle = wood;
  ctx.strokeStyle = tone("#d9c691");
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-5.9, -8.5); ctx.quadraticCurveTo(0, -11, 5.9, -8.5);
  ctx.lineTo(5.1, 3); ctx.quadraticCurveTo(0, 10, -5.1, 3);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = tone("#2d5549"); ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, 6.1); ctx.stroke();
  ellipse(ctx, 0, -1.8, 2.1, 2.1, tone("#efdb9b"));
  ctx.restore();
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
  const frame = swordMount(player);
  const gear = player.gear;
  const hasHelm = gear?.head === "trail-helm";
  const hasChest = gear?.chest === "quilted-vest";
  const hasShield = gear?.shield === "willow-shield";
  const hasBoots = gear?.feet === "trail-boots";
  const hasLegs = gear?.legs === "travel-trousers";
  const hasBackpack = gear?.backpack === "canvas-pack";
  const hasPendant = gear?.neck === "river-pendant";

  ctx.save();
  ctx.translate(
    sx + player.faceX * atk.lunge * 3.4 - player.faceX * hurt * 2.4,
    sy + player.faceY * atk.lunge * 2.2 - player.faceY * hurt * 1.4,
  );
  const lift = Math.max(g.a.lift, g.b.lift);
  softShadow(ctx, 1, 3.5, 12.5 - lift * 0.5 + Math.abs(atk.lunge) * 2, 4.6, 0.36);
  ctx.translate(0, g.bob + breath * 0.45);
  ctx.lineJoin = "round";

  if (back) renderWeapon(ctx, frame, player, tone, atk.impact, t);

  // --- pernas, ordenadas por profundidade -------------------------------
  const leftFoot = { hip: -3.6 * wf, x: -3.6 * wf + g.a.along * mvx, y: g.a.along * mvy * 0.55 - g.a.lift, lift: g.a.lift };
  const rightFoot = { hip: 3.6 * wf, x: 3.6 * wf + g.b.along * mvx, y: g.b.along * mvy * 0.55 - g.b.lift, lift: g.b.lift };
  const legs = leftFoot.y + g.a.lift <= rightFoot.y + g.b.lift ? [leftFoot, rightFoot] : [rightFoot, leftFoot];
  legs.forEach((leg, i) => drawLeg(ctx, leg.hip, leg.x, leg.y, leg.lift, mvx, tone, i,
    hasBoots, hasLegs));

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
  if (hasBackpack && !back) {
    // Mochila vista de frente: uma lateral da bolsa sob o ombro.
    ctx.save(); ctx.translate(-9 * wf - side * 3, -18);
    ctx.fillStyle = tone("#715c42"); ctx.fillRect(-3.2, -8, 6.4, 17);
    ctx.strokeStyle = tone("#c6aa78"); ctx.strokeRect(-3.2, -8, 6.4, 17);
    ctx.restore();
  }

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
  if (hasChest) {
    // Peitoral acolchoado: segmentos presos ao mesmo torso inclinado que a túnica.
    const plate = ctx.createLinearGradient(-9 * wf, -23, 9 * wf, -9);
    plate.addColorStop(0, tone("#c0caba"));
    plate.addColorStop(0.48, tone("#819c90"));
    plate.addColorStop(1, tone("#48685f"));
    ctx.fillStyle = plate; ctx.strokeStyle = tone("#d7c194"); ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-6.5 * wf, -23.5); ctx.lineTo(6.5 * wf, -23.5);
    ctx.lineTo(7 * wf, -12); ctx.lineTo(0, -10); ctx.lineTo(-7 * wf, -12);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = tone("#405d55"); ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-5.8 * wf, -18); ctx.lineTo(5.8 * wf, -18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5.8 * wf, -14); ctx.lineTo(5.8 * wf, -14); ctx.stroke();
    ellipse(ctx, side * 1.2, -20, 2.2, 2.1, tone("#e2d09d"));
  }
  if (hasPendant && !back) {
    ctx.strokeStyle = tone("#b4d7cf"); ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(-3.5, -25); ctx.quadraticCurveTo(0, -19, 3.5, -25); ctx.stroke();
    ellipse(ctx, 0, -20.8, 1.8, 2.1, tone("#71b7b3"));
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
  if (hasShield) {
    const shieldSide = -swordSide;
    const hx = shieldSide * 9.6 * wf + mvx * swing * -shieldSide * 4.2;
    const hy = -12.5 + mvy * swing * -shieldSide * 2.8 - swing * -shieldSide * 1.2 + breath * 0.3;
    drawShield(ctx, hx, hy, shieldSide, swing, tone);
  }
  const gripX = frame.gripX, gripY = frame.gripY;
  const swordArm = (): void => {
    limb(ctx, swordSide * 8.6 * wf, -22.6, gripX, gripY, 4.6, tone(PAL.tunic));
    limb(ctx, (swordSide * 8.6 * wf + gripX) / 2, (-22.6 + gripY) / 2, gripX, gripY, 4.7, tone(PAL.leatherD));
  };

  // --- cabeça --------------------------------------------------------------
  const headX = player.faceX * 1.3, headY = -31.5 + breath * 0.35 + Math.abs(Math.cos(player.walkTime)) * g.moving * -0.4 +
    atk.lunge * 0.8;
  if (back) drawCape();
  if (back && hasBackpack) {
    ctx.fillStyle = tone("#806b4b");
    ctx.beginPath();
    ctx.roundRect(-6.2 * wf, -25, 12.4 * wf, 17, 2.2);
    ctx.fill(); ctx.strokeStyle = tone("#d7b581"); ctx.lineWidth = 0.9; ctx.stroke();
    ctx.fillStyle = tone("#c0a577"); ctx.fillRect(-2.2 * wf, -21, 4.4 * wf, 2.2);
  }
  if (!back) { swordArm(); renderWeapon(ctx, frame, player, tone, atk.impact, t); ellipse(ctx, gripX, gripY, 2.6, 2.6, tone(PAL.skin)); }
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
  if (hasHelm) {
    // Elmo preserva o rosto e as piscadas; a viseira fica acima dos olhos.
    const metal = ctx.createLinearGradient(headX - 9, headY - 9, headX + 9, headY + 1);
    metal.addColorStop(0, tone("#d4dfc7"));
    metal.addColorStop(0.45, tone("#9ab5aa"));
    metal.addColorStop(1, tone("#567970"));
    ctx.fillStyle = metal; ctx.strokeStyle = tone("#344e47"); ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(headX - 8.2, headY - 3.4);
    ctx.quadraticCurveTo(headX - 8.4, headY - 10.9, headX, headY - 11.4);
    ctx.quadraticCurveTo(headX + 8.4, headY - 10.9, headX + 8.2, headY - 3.4);
    ctx.lineTo(headX + 6.9, headY - 0.8);
    ctx.lineTo(headX - 6.9, headY - 0.8);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = tone("#e5d39e");
    ctx.fillRect(headX - 8.6, headY - 3.3, 17.2, 1.3);
    ctx.fillStyle = tone("#e4e6c8");
    ctx.fillRect(headX - 1, headY - 9.6, 2, 6.1);
  }
  if (back) { swordArm(); }
  if (back) { ellipse(ctx, gripX, gripY, 2.4, 2.4, tone(PAL.skin)); }
  // Rastro e brilho por cima de tudo para ler bem em qualquer direção.
  renderTrail(ctx, player, frame);
  ctx.restore();
}


/** Compatibilidade: consumidores atuais continuam importando de actors.ts. */
export { renderSlime } from "./creatures/center/slimes/slime.ts";
export type { SlimeVisual, SlimeFx } from "./creatures/center/slimes/slime.ts";
