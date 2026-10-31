export interface Scenery {
  kind: "tree" | "rock" | "arch" | "sign" | "fire" | "house";
  x: number;
  y: number;
  variant: number;
}
const TAU = Math.PI * 2;
function ellipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}
export function renderScenery(
  ctx: CanvasRenderingContext2D,
  prop: Scenery,
  sx: number,
  sy: number,
  time: number,
  faded = false,
): void {
  ctx.save();
  ctx.translate(sx, sy);
  if (faded) ctx.globalAlpha = 0.36;
  if (prop.kind === "tree") {
    const tall = prop.variant > 0.9;
    const scale = 0.86 + prop.variant * 0.24;
    ctx.scale(scale, scale);
    ctx.fillStyle = "#3c3d2c";
    ctx.fillRect(-5, -25, 10, 27);
    ctx.fillStyle = "#7a6948";
    ctx.fillRect(-3, -24, 3, 25);
    ctx.strokeStyle = "#454c35";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-9, 4);
    ctx.lineTo(-3, -2);
    ctx.moveTo(7, 3);
    ctx.lineTo(2, -2);
    ctx.stroke();
    if (tall) {
      for (let i = 0; i < 4; i++) {
        const w = 24 - i * 4,
          yy = -12 - i * 13;
        ctx.fillStyle = (["#263e35", "#2d5040", "#3b654a", "#597e55"][i] ?? "#263e35");
        ctx.beginPath();
        ctx.moveTo(-w, yy);
        ctx.lineTo(0, yy - 32);
        ctx.lineTo(w, yy);
        ctx.lineTo(5, yy - 4);
        ctx.lineTo(-5, yy + 2);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      ellipse(ctx, 4, -25, 27, 21, "#223f32");
      ellipse(ctx, -16, -33, 19, 18, "#2f5039");
      ellipse(ctx, 14, -41, 22, 21, "#31583c");
      ellipse(ctx, -3, -50, 23, 18, "#466c43");
      ellipse(ctx, -17, -47, 14, 12, "#5c8050");
      ellipse(ctx, 5, -59, 15, 10, "#739258");
      for (let i = 0; i < 14; i++) {
        const px = Math.sin(i * 11 + prop.variant) * 23,
          py = -38 + Math.cos(i * 7) * 18;
        ellipse(ctx, px, py, 3 + (i % 3), 2, i % 3 ? "#92aa613d" : "#183b3150");
      }
    }
    // Ferns make trunks meet the ground without a rectangular tile outline.
    ctx.strokeStyle = "#9ca85f";
    ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(-10, 3);
      ctx.quadraticCurveTo(-17 + i * 3, -8, -18 + i * 5, -3);
      ctx.stroke();
    }
  } else if (prop.kind === "house") {
    const walls = ["#bda477", "#987b60", "#b4a28a"];
    const roofs = ["#6c4440", "#4c6261", "#6b604d"];
    ellipse(ctx, 0, 0, 51, 10, "#20352d66");
    ctx.fillStyle = (walls[prop.variant % 3] ?? "#6b6454"); ctx.fillRect(-44, -58, 88, 59);
    ctx.fillStyle = "#73563c"; ctx.fillRect(-10, -36, 20, 37);
    ctx.fillStyle = "#e4c78c"; ctx.fillRect(5, -18, 2, 3);
    for (const xx of [-30, 26]) {
      ctx.fillStyle = "#3a5149"; ctx.fillRect(xx - 8, -43, 16, 19);
      ctx.fillStyle = "#afd3bb"; ctx.fillRect(xx - 5, -40, 10, 13);
      ctx.fillStyle = "#73563c"; ctx.fillRect(xx - 1, -42, 2, 18);
    }
    ctx.fillStyle = (roofs[prop.variant % 3] ?? "#664f45");
    ctx.beginPath(); ctx.moveTo(-54, -58); ctx.lineTo(0, -98); ctx.lineTo(54, -58); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#e4c99a"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-49, -58); ctx.lineTo(0, -92); ctx.lineTo(49, -58); ctx.stroke();
    ctx.fillStyle = "#493b31"; ctx.fillRect(24, -103, 12, 33);
  } else if (prop.kind === "rock") {
    ctx.fillStyle = "#45554b";
    ctx.beginPath();
    ctx.moveTo(-13, 0);
    ctx.lineTo(-14, -11);
    ctx.lineTo(-6, -21);
    ctx.lineTo(7, -18);
    ctx.lineTo(14, -8);
    ctx.lineTo(12, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#9b9f88";
    ctx.beginPath();
    ctx.moveTo(-14, -11);
    ctx.lineTo(-6, -21);
    ctx.lineTo(7, -18);
    ctx.lineTo(1, -7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#768575";
    ctx.beginPath();
    ctx.moveTo(1, -7);
    ctx.lineTo(7, -18);
    ctx.lineTo(14, -8);
    ctx.lineTo(12, 0);
    ctx.closePath();
    ctx.fill();
    ellipse(ctx, -5, -3, 7, 2, "#6f8653");
  } else if (prop.kind === "arch") {
    ellipse(ctx, 4, 2, 42, 10, "#1a302b33");
    for (const x of [-26, 26]) {
      ctx.fillStyle = "#424e47";
      ctx.fillRect(x - 10, -47, 20, 49);
      ctx.fillStyle = "#909780";
      ctx.fillRect(x - 9, -47, 14, 48);
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i % 2 ? "#717e6c" : "#a3a38a";
        ctx.fillRect(x - 11, -48 + i * 13, 20, 3);
      }
      ctx.fillStyle = "#b2b49a";
      ctx.fillRect(x - 13, -52, 25, 6);
    }
    ctx.strokeStyle = "#4a584c";
    ctx.lineWidth = 17;
    ctx.beginPath();
    ctx.arc(0, -45, 26, Math.PI, TAU);
    ctx.stroke();
    ctx.strokeStyle = "#929d80";
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(-2, -48, 26, Math.PI, TAU);
    ctx.stroke();
    ctx.strokeStyle = "#c4b48b";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 6; i++) {
      const a = Math.PI + (i * Math.PI) / 6;
      ctx.beginPath();
      ctx.moveTo(-2 + Math.cos(a) * 20, -48 + Math.sin(a) * 20);
      ctx.lineTo(-2 + Math.cos(a) * 32, -48 + Math.sin(a) * 32);
      ctx.stroke();
    }
    ctx.fillStyle = "#425f3c";
    ctx.fillRect(-37, -51, 12, 4);
    ctx.fillRect(20, -23, 13, 4);
    ellipse(ctx, -32, -40, 4, 8, "#62804b");
    ellipse(ctx, 30, -15, 4, 6, "#648349");
  } else if (prop.kind === "sign") {
    ctx.fillStyle = "#594b36";
    ctx.fillRect(-2, -22, 4, 25);
    ctx.fillStyle = "#aa8b57";
    ctx.beginPath();
    ctx.moveTo(-16, -28);
    ctx.lineTo(10, -28);
    ctx.lineTo(17, -22);
    ctx.lineTo(10, -16);
    ctx.lineTo(-16, -16);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#4a4a33";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#594d32";
    ctx.fillRect(-11, -24, 17, 2);
    ctx.fillRect(-11, -20, 11, 1);
  } else {
    ellipse(ctx, 0, 0, 15, 8, "#4e5746");
    for (let i = 0; i < 7; i++)
      ellipse(
        ctx,
        Math.cos((i * TAU) / 7) * 13,
        Math.sin((i * TAU) / 7) * 6,
        4,
        3,
        "#969b7e",
      );
    ctx.strokeStyle = "#624937";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-7, -4);
    ctx.lineTo(7, 2);
    ctx.moveTo(7, -4);
    ctx.lineTo(-7, 2);
    ctx.stroke();
    const flicker = Math.sin(time * 9) * 2;
    ctx.fillStyle = "#d38646";
    ctx.beginPath();
    ctx.moveTo(-7, -2);
    ctx.quadraticCurveTo(-9, -10, -2, -20 - flicker);
    ctx.quadraticCurveTo(-2, -10, 4, -17);
    ctx.quadraticCurveTo(12, -5, 4, -1);
    ctx.fill();
    ellipse(ctx, 0, -5, 3, 6, "#f6d78e");
  }
  ctx.restore();
}
