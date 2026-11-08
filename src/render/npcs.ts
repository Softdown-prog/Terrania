import type { Npc } from "../world/npcs.ts";
import { blink } from "./animation.ts";
import { clamp01, easeOutBack, ellipse, hashString, limb, mix, rgba, softShadow, TAU } from "./draw.ts";

interface NpcLook {
  robe: string; trim: string; accent: string; skin: string; hair: string;
  hairStyle: "long" | "short" | "bald" | "bun";
  prop: "staff" | "scroll" | "hammer" | "lantern";
  width: number; beard?: string; apron?: string;
}
const LOOKS: Record<string, NpcLook> = {
  aela: { robe: "#456f4d", trim: "#b9c68b", accent: "#8fe0a8", skin: "#e0b88f", hair: "#b8763d", hairStyle: "long", prop: "staff", width: 1 },
  mira: { robe: "#4f7c8a", trim: "#d8c58e", accent: "#e9d9a4", skin: "#d9ae86", hair: "#2f2a3a", hairStyle: "short", prop: "scroll", width: 1 },
  toren: { robe: "#7a5a43", trim: "#a98859", accent: "#ff9a4d", skin: "#c99a73", hair: "#3f2c20", hairStyle: "bald", prop: "hammer", width: 1.14, beard: "#4a3426", apron: "#3d3029" },
  lina: { robe: "#9a6c66", trim: "#ecdcb9", accent: "#ffd37a", skin: "#e3bb94", hair: "#6c3d2c", hairStyle: "bun", prop: "lantern", width: 1, apron: "#eadfc2" },
};
const FALLBACK: NpcLook = { robe: "#547561", trim: "#b9a273", accent: "#c6bd87", skin: "#ddb68f", hair: "#443a2d", hairStyle: "short", prop: "staff", width: 1 };

function drawProp(ctx: CanvasRenderingContext2D, look: NpcLook, t: number, hx: number, hy: number): void {
  if (look.prop === "staff") {
    limb(ctx, hx, hy + 18, hx + 1.5, hy - 24, 3, "#7d6143");
    limb(ctx, hx - 0.6, hy + 17, hx + 0.4, hy - 23, 1, "#b09468");
    const pulse = 0.65 + 0.35 * Math.sin(t * 2.6);
    const glow = ctx.createRadialGradient(hx + 1.5, hy - 28, 1, hx + 1.5, hy - 28, 13);
    glow.addColorStop(0, rgba(look.accent, 0.6 * pulse)); glow.addColorStop(1, rgba(look.accent, 0));
    ctx.fillStyle = glow; ctx.fillRect(hx - 12, hy - 42, 28, 28);
    ctx.fillStyle = mix(look.accent, "#ffffff", 0.2);
    ctx.beginPath();
    ctx.moveTo(hx + 1.5, hy - 35); ctx.lineTo(hx + 5, hy - 28); ctx.lineTo(hx + 1.5, hy - 22); ctx.lineTo(hx - 2, hy - 28);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba("#ffffff", 0.7);
    ctx.fillRect(hx - 0.5, hy - 32, 1.4, 4);
  } else if (look.prop === "scroll") {
    ctx.save(); ctx.translate(hx, hy - 1); ctx.rotate(-0.5);
    ctx.fillStyle = "#e8dcb9"; ctx.fillRect(-9, -2.8, 18, 5.6);
    ctx.fillStyle = "#c6b88f"; ctx.fillRect(-9, 1.4, 18, 1.4);
    ellipse(ctx, -9, 0, 1.8, 3.4, "#b59f74"); ellipse(ctx, 9, 0, 1.8, 3.4, "#b59f74");
    ctx.strokeStyle = "#7d6a4b"; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(-6, -0.8); ctx.lineTo(1, -0.8); ctx.moveTo(-6, 0.9); ctx.lineTo(5, 0.9); ctx.stroke();
    ctx.restore();
  } else if (look.prop === "hammer") {
    const swing = Math.sin(t * 1.4) * 0.05;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(0.35 + swing);
    ctx.fillStyle = "#7d6143"; ctx.fillRect(-1.4, -4, 2.8, 22);
    ctx.fillStyle = "#4b4f54"; ctx.fillRect(-6, -10, 12, 7);
    ctx.fillStyle = "#8a9096"; ctx.fillRect(-6, -10, 12, 2);
    ctx.fillStyle = "#2f3236"; ctx.fillRect(4, -10, 2, 7);
    ctx.restore();
  } else {
    const sway = Math.sin(t * 1.7) * 0.07;
    ctx.save(); ctx.translate(hx, hy + 2); ctx.rotate(sway);
    ctx.strokeStyle = "#5b4a35"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, -1, 4, Math.PI, TAU); ctx.stroke();
    const glow = ctx.createRadialGradient(0, 7, 1, 0, 7, 16);
    glow.addColorStop(0, rgba(look.accent, 0.5 + 0.1 * Math.sin(t * 8))); glow.addColorStop(1, rgba(look.accent, 0));
    ctx.fillStyle = glow; ctx.fillRect(-16, -9, 32, 32);
    ctx.fillStyle = "#5b4a35"; ctx.fillRect(-3.4, 2, 6.8, 1.6); ctx.fillRect(-3.4, 11, 6.8, 1.6);
    ctx.fillStyle = rgba("#ffe7a8", 0.92); ctx.fillRect(-2.8, 3.6, 5.6, 7.4);
    ellipse(ctx, 0, 8, 1.4, 2.4, "#fff6cf");
    ctx.restore();
  }
}

/**
 * Personagem desenhada em Canvas; sem imagens ou dependências externas.
 * Cada moradora(or) tem silhueta, cores e adereço próprios; respira, pisca,
 * olha para o jogador e acena quando ele está ao alcance da conversa.
 */
export function renderNpc(ctx: CanvasRenderingContext2D, npc: Npc,
  sx: number, sy: number, nearby: boolean, time = 0,
  lookX = 0, lookY = 1): void {
  if (npc.kind === "sign" || npc.kind === "door") return;
  const look = LOOKS[npc.id] ?? FALLBACK;
  const seed = hashString(npc.id);
  const t = time;
  const len = Math.hypot(lookX, lookY) || 1;
  const lx = lookX / len, ly = lookY / len;
  const w = look.width;
  const breath = Math.sin(t * 2.1 + seed * 6);
  const sway = Math.sin(t * 1.3 + seed * 3) * 0.6;
  ctx.save();
  ctx.translate(sx, sy);
  softShadow(ctx, 0, 3.5, 13 * w, 4.6, 0.38);
  ctx.translate(0, breath * 0.35);
  ctx.lineJoin = "round";
  // botas
  ellipse(ctx, -4.4 * w, 0.4, 4.2, 2.3, "#46362b");
  ellipse(ctx, 4.4 * w, 0.4, 4.2, 2.3, "#46362b");
  // túnica/vestido com bainha que balança
  const robe = ctx.createLinearGradient(-12 * w, 0, 12 * w, 0);
  robe.addColorStop(0, mix(look.robe, "#ffffff", 0.18)); robe.addColorStop(0.5, look.robe); robe.addColorStop(1, mix(look.robe, "#0b1d22", 0.38));
  ctx.fillStyle = robe;
  ctx.beginPath();
  ctx.moveTo(-8 * w, -26); ctx.quadraticCurveTo(0, -28, 8 * w, -26);
  ctx.lineTo(11 * w + sway, -2);
  ctx.quadraticCurveTo(0, 1 + breath * 0.4, -11 * w + sway, -2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba("#142a2a", 0.5); ctx.lineWidth = 1; ctx.stroke();
  ctx.strokeStyle = rgba("#000000", 0.14); ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-3, -14); ctx.lineTo(-4 + sway * 0.5, -2); ctx.moveTo(4, -14); ctx.lineTo(5 + sway * 0.5, -2); ctx.stroke();
  ctx.fillStyle = rgba(look.trim, 0.95); // barra
  ctx.beginPath(); ctx.moveTo(-10.6 * w + sway, -4.4); ctx.quadraticCurveTo(0, -1.6, 10.6 * w + sway, -4.4);
  ctx.lineTo(11 * w + sway, -2); ctx.quadraticCurveTo(0, 1 + breath * 0.4, -11 * w + sway, -2); ctx.closePath(); ctx.fill();
  if (look.apron) {
    ctx.fillStyle = look.apron;
    ctx.beginPath(); ctx.moveTo(-5.4 * w, -19); ctx.lineTo(5.4 * w, -19); ctx.lineTo(7 * w, -3); ctx.lineTo(-7 * w, -3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba("#ffffff", 0.16); ctx.fillRect(-4.5 * w, -18, 2, 14);
  } else {
    ctx.fillStyle = rgba(look.trim, 0.9); ctx.fillRect(-1.6, -25, 3.2, 20);
  }
  // cinto
  ctx.fillStyle = "#6b5338"; ctx.fillRect(-8.6 * w, -13, 17.2 * w, 3);
  ctx.fillStyle = look.trim; ctx.fillRect(-1.8, -13.4, 3.6, 3.8);
  // braços
  const wave = nearby ? Math.sin(t * 7) * 0.5 : 0;
  const hold = look.prop === "staff" || look.prop === "hammer";
  const lhX = -10.6 * w, lhY = -12 + (nearby ? -10 + wave * 3 : breath * 0.4);
  limb(ctx, -8.2 * w, -23, lhX, lhY, 4.6, look.robe);
  ellipse(ctx, lhX, lhY, 2.4, 2.4, look.skin);
  const rhX = 11 * w, rhY = hold ? -13 : -14 + breath * 0.3;
  limb(ctx, 8.2 * w, -23, rhX, rhY, 4.6, mix(look.robe, "#0b1d22", 0.15));
  drawProp(ctx, look, t, rhX + (look.prop === "staff" ? 1 : 2), rhY);
  ellipse(ctx, rhX, rhY, 2.4, 2.4, look.skin);
  // cabeça
  const hx = lx * 1.7, hy = -31.5 + breath * 0.3 + (nearby ? Math.sin(t * 3) * 0.3 : 0);
  if (look.hairStyle === "long") {
    ctx.fillStyle = look.hair;
    ctx.beginPath(); ctx.moveTo(hx - 9, hy - 2); ctx.quadraticCurveTo(hx - 12, hy + 12, hx - 7 + sway * 0.4, hy + 15);
    ctx.lineTo(hx + 7 + sway * 0.4, hy + 15); ctx.quadraticCurveTo(hx + 12, hy + 12, hx + 9, hy - 2); ctx.closePath(); ctx.fill();
  }
  ellipse(ctx, hx, hy - 0.8, 8.9, 9.2, look.hair);
  const face = ctx.createRadialGradient(hx - 2, hy - 2, 1, hx, hy + 1, 8.5);
  face.addColorStop(0, mix(look.skin, "#ffffff", 0.2)); face.addColorStop(0.75, look.skin); face.addColorStop(1, mix(look.skin, "#3a1f12", 0.28));
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.moveTo(hx - 7, hy - 3); ctx.quadraticCurveTo(hx, hy - 6, hx + 7, hy - 3);
  ctx.quadraticCurveTo(hx + 8, hy + 3.6, hx + 3.4, hy + 8); ctx.quadraticCurveTo(hx, hy + 9.2, hx - 3.4, hy + 8);
  ctx.quadraticCurveTo(hx - 8, hy + 3.6, hx - 7, hy - 3); ctx.closePath(); ctx.fill();
  const eyeY = hy + 0.6 + ly * 0.6;
  const closed = blink(t, seed * 10);
  for (const ex of [-3.1, 3.1]) {
    ellipse(ctx, hx + ex, eyeY, 1.8, 2.2 * (1 - closed) + 0.25, "#f6f1e3");
    ellipse(ctx, hx + ex + lx * 0.7, eyeY + ly * 0.5, 1.1, 1.5 * (1 - closed) + 0.2, "#22372f");
  }
  ellipse(ctx, hx - 4.6, hy + 4, 1.8, 1, rgba("#d9806a", 0.28));
  ellipse(ctx, hx + 4.6, hy + 4, 1.8, 1, rgba("#d9806a", 0.28));
  ctx.strokeStyle = "#6b4535"; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(hx - 2.2 + lx, hy + 5.6); ctx.quadraticCurveTo(hx + lx, hy + (nearby ? 7.4 : 6.4), hx + 2.2 + lx, hy + 5.6);
  ctx.stroke();
  if (look.beard) {
    ctx.fillStyle = look.beard;
    ctx.beginPath(); ctx.moveTo(hx - 7, hy + 1.5); ctx.quadraticCurveTo(hx - 7.5, hy + 11, hx, hy + 12);
    ctx.quadraticCurveTo(hx + 7.5, hy + 11, hx + 7, hy + 1.5); ctx.quadraticCurveTo(hx + 4, hy + 5, hx, hy + 4.4);
    ctx.quadraticCurveTo(hx - 4, hy + 5, hx - 7, hy + 1.5); ctx.closePath(); ctx.fill();
  }
  if (look.hairStyle !== "bald") {
    ctx.fillStyle = look.hair;
    ctx.beginPath();
    ctx.moveTo(hx - 9, hy - 0.4); ctx.quadraticCurveTo(hx - 9.6, hy - 9.6, hx - 1, hy - 10);
    ctx.quadraticCurveTo(hx + 8, hy - 9.8, hx + 9, hy - 0.4); ctx.quadraticCurveTo(hx + 6.4, hy - 4.6, hx + 2.6, hy - 5);
    ctx.quadraticCurveTo(hx - 1, hy - 2.6, hx - 3.6, hy - 5); ctx.quadraticCurveTo(hx - 7, hy - 3, hx - 9, hy - 0.4);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = mix(look.hair, "#ffffff", 0.3); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(hx - 6, hy - 7.6); ctx.quadraticCurveTo(hx - 1, hy - 9.8, hx + 4, hy - 8); ctx.stroke();
  } else {
    ellipse(ctx, hx - 2.4, hy - 6.4, 3.4, 1.6, rgba("#ffffff", 0.3), -0.3);
  }
  if (look.hairStyle === "bun") {
    ellipse(ctx, hx, hy - 10.4, 4.6, 3.8, look.hair);
    ellipse(ctx, hx - 1, hy - 11.4, 2, 1, mix(look.hair, "#ffffff", 0.3));
  }
  if (npc.id === "mira") {
    ctx.fillStyle = "#3d5a66";
    ctx.beginPath(); ctx.moveTo(hx - 9, hy - 3); ctx.quadraticCurveTo(hx, hy - 14, hx + 9, hy - 3);
    ctx.quadraticCurveTo(hx, hy - 6.4, hx - 9, hy - 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = look.trim; ctx.fillRect(hx - 9, hy - 3.6, 18, 1.4);
  }
  // rótulo
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.font = "600 10px system-ui";
  ctx.strokeStyle = "#16302c";
  ctx.fillStyle = "#f1ddb0";
  ctx.strokeText(npc.name, 0, -54);
  ctx.fillText(npc.name, 0, -54);
  if (nearby) {
    const pop = easeOutBack(clamp01((t * 4) % 1000));
    const bob = Math.sin(t * 5) * 1.6;
    ctx.save();
    ctx.translate(0, -70 + bob);
    ctx.scale(pop, pop);
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 16);
    glow.addColorStop(0, "rgba(255,226,140,.5)"); glow.addColorStop(1, "rgba(255,226,140,0)");
    ctx.fillStyle = glow; ctx.fillRect(-16, -16, 32, 32);
    ellipse(ctx, 0, 0, 8.4, 10.4, "#7a6431");
    ellipse(ctx, 0, -0.4, 7.4, 9.4, "#f0d98f");
    ellipse(ctx, -2, -3.6, 3, 3.4, rgba("#ffffff", 0.35));
    ctx.fillStyle = "#24433b";
    ctx.font = "bold 14px system-ui";
    ctx.fillText("!", 0, 5);
    ctx.restore();
  }
  ctx.restore();
}
