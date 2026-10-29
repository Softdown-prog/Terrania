import type { Npc } from "../world/npcs.ts";

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number,
  rx: number, ry: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Personagem desenhada em Canvas; sem imagens ou dependências externas. */
export function renderNpc(ctx: CanvasRenderingContext2D, npc: Npc,
  sx: number, sy: number, nearby: boolean): void {
  ctx.save();
  ctx.translate(sx, sy);
  ellipse(ctx, 0, 3, 12, 4, "#142f2a88");
  ctx.fillStyle = "#273d37";
  ctx.beginPath();
  ctx.moveTo(-8, -26); ctx.lineTo(8, -26);
  ctx.lineTo(13, 0); ctx.lineTo(-13, 0);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#547561";
  ctx.beginPath();
  ctx.moveTo(-7, -25); ctx.lineTo(7, -25);
  ctx.lineTo(10, -1); ctx.lineTo(-9, -1);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#92a785";
  ctx.fillRect(-5, -22, 3, 18);
  ctx.fillStyle = "#b9a273";
  ctx.fillRect(-8, -11, 16, 3);
  ctx.fillRect(-2, -11, 4, 3);
  ctx.fillStyle = "#ddb68f";
  ctx.fillRect(-11, -14, 5, 7);
  ctx.fillRect(8, -14, 5, 7);
  ctx.strokeStyle = "#93724e";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(14, -37); ctx.lineTo(17, 3); ctx.stroke();
  ellipse(ctx, 14, -39, 4, 5, "#c6bd87");
  ellipse(ctx, 0, -30, 9, 11, "#443a2d");
  ellipse(ctx, 0, -30, 7, 8, "#dfbb92");
  ctx.fillStyle = "#283e37";
  ctx.fillRect(-5, -31, 2, 2);
  ctx.fillRect(3, -31, 2, 2);
  ctx.fillStyle = "#34443a";
  ctx.beginPath();
  ctx.moveTo(-10, -31); ctx.lineTo(-9, -40);
  ctx.lineTo(-2, -45); ctx.lineTo(7, -41);
  ctx.lineTo(10, -32); ctx.lineTo(6, -37);
  ctx.lineTo(-7, -36); ctx.closePath(); ctx.fill();
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.font = "600 10px system-ui";
  ctx.strokeStyle = "#16302c";
  ctx.fillStyle = "#f1ddb0";
  ctx.strokeText(npc.name, 0, -54);
  ctx.fillText(npc.name, 0, -54);
  if (nearby) {
    ellipse(ctx, 0, -70, 8, 10, "#d9c387");
    ctx.fillStyle = "#24433b";
    ctx.font = "bold 14px system-ui";
    ctx.fillText("!", 0, -65);
  }
  ctx.restore();
}
