import { renderHero } from "./actors.ts";
import { ROOM_HEIGHT, ROOM_WIDTH, type Furniture, type InteriorRoom } from "../engine/rooms/InteriorRoom.ts";
import { ellipse, mix, rgba, softShadow } from "./draw.ts";
import { hash2 } from "../world/random.ts";

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, top: string, front: string, depth: number): void {
  ctx.fillStyle = front; ctx.fillRect(x, y + h - depth, w, depth);
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, mix(top, "#ffffff", 0.14)); g.addColorStop(1, mix(top, "#0b1d22", 0.14));
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h - depth);
  ctx.fillStyle = rgba("#ffffff", 0.2); ctx.fillRect(x, y, w, 1.4);
  ctx.fillStyle = rgba("#000000", 0.25); ctx.fillRect(x, y + h - depth, w, 1.2);
}

function drawFurniture(ctx: CanvasRenderingContext2D, f: Furniture, wood: string, time: number): void {
  softShadow(ctx, f.x + f.width / 2 + 3, f.y + f.height - 1, f.width * 0.62, 7, 0.42);
  if (f.kind === "anvil") {
    box(ctx, f.x, f.y + 12, f.width, f.height - 12, "#3b454c", "#252d33", 12);
    box(ctx, f.x + 14, f.y + 16, f.width - 28, 14, "#454f55", "#2d363b", 6);
    const g = ctx.createLinearGradient(0, f.y + 4, 0, f.y + 20);
    g.addColorStop(0, "#d3d9d4"); g.addColorStop(1, "#7f8a8c");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(f.x + 2, f.y + 6); ctx.lineTo(f.x + f.width - 2, f.y + 6); ctx.lineTo(f.x + f.width - 12, f.y + 20);
    ctx.lineTo(f.x + 12, f.y + 20); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#2c353b"; ctx.fillRect(f.x - 6, f.y + 7, 10, 5);
    ctx.fillStyle = rgba("#ffffff", 0.5); ctx.fillRect(f.x + 5, f.y + 7, f.width - 12, 1.4);
    ellipse(ctx, f.x + f.width * 0.62, f.y + 11, 4, 1.4, rgba("#ff8a3a", 0.5 + Math.sin(time * 6) * 0.1));
  } else if (f.kind === "forge") {
    box(ctx, f.x, f.y, f.width, f.height, "#585049", "#3b362f", 14);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
      ctx.fillStyle = rgba(j % 2 ? "#ffffff" : "#000000", 0.08);
      ctx.fillRect(f.x + 2 + i * 12 + (j % 2) * 6, f.y + 2 + j * 14, 11, 12);
    }
    ctx.fillStyle = "#1a1512"; ctx.fillRect(f.x + 12, f.y + 14, f.width - 24, f.height - 28);
    const flick = 0.8 + Math.sin(time * 9) * 0.1 + Math.sin(time * 14.3) * 0.07;
    const g = ctx.createRadialGradient(f.x + f.width / 2, f.y + f.height - 22, 2, f.x + f.width / 2, f.y + f.height - 22, 26);
    g.addColorStop(0, rgba("#ffd27a", flick)); g.addColorStop(0.5, rgba("#e8742c", 0.9 * flick)); g.addColorStop(1, rgba("#7a2a14", 0.6));
    ctx.fillStyle = g; ctx.fillRect(f.x + 12, f.y + 14, f.width - 24, f.height - 28);
    ctx.fillStyle = "#1a1512";
    for (let i = 0; i < 4; i++) ctx.fillRect(f.x + 18 + i * 11, f.y + 14, 2, f.height - 28);
    ctx.fillStyle = "#4a4039"; ctx.fillRect(f.x + 8, f.y + 8, f.width - 16, 6);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const glow = ctx.createRadialGradient(f.x + f.width / 2, f.y + f.height - 14, 4, f.x + f.width / 2, f.y + f.height - 14, 90);
    glow.addColorStop(0, rgba("#ff8a3a", 0.3 * flick)); glow.addColorStop(1, rgba("#ff8a3a", 0));
    ctx.fillStyle = glow; ctx.fillRect(f.x - 70, f.y - 60, f.width + 140, f.height + 170);
    ctx.restore();
  } else if (f.kind === "bed") {
    box(ctx, f.x, f.y, f.width, f.height, "#6b4e36", "#4a3524", 8);
    ctx.fillStyle = "#e5d8bd"; ctx.fillRect(f.x + 5, f.y + 5, f.width - 10, f.height - 17);
    const blanket = ctx.createLinearGradient(f.x, f.y + 28, f.x, f.y + f.height);
    blanket.addColorStop(0, "#7ea09a"); blanket.addColorStop(1, "#4f726f");
    ctx.fillStyle = blanket;
    ctx.beginPath(); ctx.moveTo(f.x + 5, f.y + 29); ctx.quadraticCurveTo(f.x + f.width / 2, f.y + 25, f.x + f.width - 5, f.y + 29);
    ctx.lineTo(f.x + f.width - 5, f.y + f.height - 12); ctx.lineTo(f.x + 5, f.y + f.height - 12); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba("#ffffff", 0.22); ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(f.x + 8, f.y + 29 + i * 9); ctx.lineTo(f.x + f.width - 8, f.y + 29 + i * 9); ctx.stroke(); }
    ellipse(ctx, f.x + f.width / 2, f.y + 16, (f.width - 26) / 2, 8, "#f4ead4");
    ellipse(ctx, f.x + f.width / 2 - 3, f.y + 14, (f.width - 40) / 2, 4, rgba("#ffffff", 0.5));
  } else {
    box(ctx, f.x, f.y, f.width, f.height, wood, mix(wood, "#0b1d22", 0.4), f.kind === "shelf" ? 4 : 10);
    if (f.kind === "shelf") {
      ctx.fillStyle = "#43332a"; ctx.fillRect(f.x + 3, f.y + 3, f.width - 6, f.height - 8);
      for (let r = 0; r < 2; r++) {
        const ry = f.y + 5 + r * 20;
        for (let i = 0; i < 6; i++) {
          const h = 12 + hash2(i, r, 3) * 6;
          ctx.fillStyle = ["#526e72", "#7a4d44", "#b09258", "#5d7a54", "#6a5a7e"][(i + r * 2) % 5] ?? "#526e72";
          ctx.fillRect(f.x + 6 + i * 10, ry + 18 - h, 7, h);
          ctx.fillStyle = rgba("#ffffff", 0.2); ctx.fillRect(f.x + 6 + i * 10, ry + 18 - h, 1.4, h);
        }
        ctx.fillStyle = "#7a5a3a"; ctx.fillRect(f.x + 3, ry + 18, f.width - 6, 2.4);
      }
    } else if (f.kind === "bench") {
      ctx.fillStyle = mix(wood, "#ffffff", 0.1); ctx.fillRect(f.x + 4, f.y + 4, f.width - 8, 8);
      ctx.fillStyle = "#3f2f23"; ctx.fillRect(f.x + 6, f.y + f.height - 8, 5, 8); ctx.fillRect(f.x + f.width - 11, f.y + f.height - 8, 5, 8);
    } else {
      // mesa: tampo com jarro, velas e pergaminho
      ctx.strokeStyle = rgba("#2b1d12", 0.22); ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(f.x + 3, f.y + i * (f.height - 10) / 4); ctx.lineTo(f.x + f.width - 3, f.y + i * (f.height - 10) / 4); ctx.stroke(); }
      ellipse(ctx, f.x + f.width * 0.26, f.y + (f.height - 10) * 0.5, 5, 3.6, "#7a8f8c");
      ellipse(ctx, f.x + f.width * 0.26, f.y + (f.height - 10) * 0.5 - 1, 3.6, 2, "#42605e");
      ctx.fillStyle = "#e8dcb9"; ctx.fillRect(f.x + f.width * 0.5, f.y + 6, 16, 10);
      ctx.fillStyle = "#7d6a4b"; ctx.fillRect(f.x + f.width * 0.5 + 2, f.y + 8, 10, 1); ctx.fillRect(f.x + f.width * 0.5 + 2, f.y + 11, 7, 1);
      const cx = f.x + f.width * 0.8, cy = f.y + (f.height - 10) * 0.45;
      ctx.fillStyle = "#e6dcc0"; ctx.fillRect(cx - 1.5, cy - 4, 3, 7);
      const fl = 1 + Math.sin(time * 10 + f.x) * 0.2;
      ellipse(ctx, cx, cy - 6, 1.4, 2.6 * fl, "#ffc866");
      const g = ctx.createRadialGradient(cx, cy - 5, 1, cx, cy - 5, 24);
      g.addColorStop(0, rgba("#ffd27a", 0.28)); g.addColorStop(1, rgba("#ffd27a", 0));
      ctx.fillStyle = g; ctx.fillRect(cx - 24, cy - 29, 48, 48);
    }
  }
}

/** Cada sala tem decoração própria e usa a mobília da mesma simulação que calcula colisões. */
export function drawInterior(ctx: CanvasRenderingContext2D, room: InteriorRoom, time = 0): void {
  const palette = [
    { wall: "#586b5c", floor: "#8e7859", wood: "#b39a6c" },
    { wall: "#69645a", floor: "#6c685e", wood: "#a68a6b" },
    { wall: "#765e50", floor: "#a08160", wood: "#c5a07a" },
  ][room.building.variant] ?? { wall: "#586b5c", floor: "#8e7859", wood: "#b39a6c" };
  ctx.fillStyle = "#172a26"; ctx.fillRect(-16, -16, ROOM_WIDTH + 32, ROOM_HEIGHT + 32);
  // piso de tábuas com variação individual de tom
  ctx.fillStyle = palette.floor; ctx.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
  for (let row = 0, y = 48; y < ROOM_HEIGHT; row++, y += 30) {
    for (let x = -(row % 2) * 36; x < ROOM_WIDTH; x += 72) {
      const k = hash2(Math.floor(x / 72), row, 17);
      ctx.fillStyle = k < 0.5 ? rgba("#000000", 0.05 + k * 0.08) : rgba("#ffffff", (k - 0.5) * 0.12);
      ctx.fillRect(x, y, 72, 30);
      ctx.fillStyle = rgba("#2a1d12", 0.35); ctx.fillRect(x, y, 1.4, 30);
      ctx.fillStyle = rgba("#2a1d12", 0.3); ctx.fillRect(x, y + 29, 72, 1.2);
      ctx.fillStyle = rgba("#2a1d12", 0.1);
      ctx.fillRect(x + 6 + k * 30, y + 8, 20, 1); ctx.fillRect(x + 22 + k * 20, y + 20, 26, 1);
    }
  }
  // parede com friso de madeira
  const wg = ctx.createLinearGradient(0, 0, 0, 52);
  wg.addColorStop(0, mix(palette.wall, "#0b1d22", 0.28)); wg.addColorStop(1, palette.wall);
  ctx.fillStyle = wg; ctx.fillRect(0, 0, ROOM_WIDTH, 52);
  for (let x = 0; x < ROOM_WIDTH; x += 6) {
    ctx.fillStyle = rgba("#000000", x % 12 ? 0.05 : 0.0); ctx.fillRect(x, 0, 3, 52);
  }
  ctx.fillStyle = mix(palette.wood, "#0b1d22", 0.45); ctx.fillRect(0, 31, ROOM_WIDTH, 18);
  ctx.fillStyle = rgba("#ffffff", 0.14); ctx.fillRect(0, 31, ROOM_WIDTH, 1.4);
  for (let x = 6; x < ROOM_WIDTH; x += 30) { ctx.fillStyle = rgba("#000000", 0.2); ctx.fillRect(x, 34, 1.4, 12); }
  ctx.fillStyle = "#463c2f"; ctx.fillRect(0, 49, ROOM_WIDTH, 8);
  ctx.fillStyle = rgba("#ffffff", 0.12); ctx.fillRect(0, 49, ROOM_WIDTH, 1.2);
  const sh = ctx.createLinearGradient(0, 57, 0, 80);
  sh.addColorStop(0, rgba("#000000", 0.28)); sh.addColorStop(1, rgba("#000000", 0));
  ctx.fillStyle = sh; ctx.fillRect(0, 57, ROOM_WIDTH, 23);
  // janela com vista e raio de luz sobre o piso
  ctx.fillStyle = "#d8c292"; ctx.fillRect(151, 10, 58, 37);
  const sky = ctx.createLinearGradient(0, 16, 0, 41);
  sky.addColorStop(0, "#8ec2d0"); sky.addColorStop(0.7, "#b9dcc6"); sky.addColorStop(1, "#6f9a64");
  ctx.fillStyle = sky; ctx.fillRect(157, 16, 46, 25);
  ctx.fillStyle = "#5a7f55"; ctx.beginPath(); ctx.moveTo(157, 41); ctx.lineTo(170, 31); ctx.lineTo(184, 38); ctx.lineTo(203, 30); ctx.lineTo(203, 41); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#d8c292"; ctx.fillRect(179, 16, 3, 25); ctx.fillRect(157, 27, 46, 2.4);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const beam = ctx.createLinearGradient(180, 47, 150, 190);
  beam.addColorStop(0, rgba("#fff0b8", 0.2)); beam.addColorStop(1, rgba("#fff0b8", 0));
  ctx.fillStyle = beam;
  ctx.beginPath(); ctx.moveTo(157, 48); ctx.lineTo(203, 48); ctx.lineTo(176, 200); ctx.lineTo(110, 200); ctx.closePath(); ctx.fill();
  ctx.restore();
  // tochas na parede
  for (const tx of [60, 300]) {
    ctx.fillStyle = "#3a2e25"; ctx.fillRect(tx - 2, 20, 4, 14);
    ctx.fillStyle = "#6a5848"; ctx.fillRect(tx - 4, 18, 8, 3);
    const fl = 1 + Math.sin(time * 11 + tx) * 0.18;
    ellipse(ctx, tx, 13, 3.2, 6 * fl, "#e8742c"); ellipse(ctx, tx, 14, 1.8, 3.6 * fl, "#ffd27a");
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(tx, 16, 2, tx, 16, 64);
    g.addColorStop(0, rgba("#ff9a48", 0.26 * fl)); g.addColorStop(1, rgba("#ff9a48", 0));
    ctx.fillStyle = g; ctx.fillRect(tx - 64, -48, 128, 128); ctx.restore();
  }
  // paredes laterais e porta
  ctx.fillStyle = "#273830";
  ctx.fillRect(0, 0, 11, ROOM_HEIGHT);
  ctx.fillRect(ROOM_WIDTH - 11, 0, 11, ROOM_HEIGHT);
  ctx.fillRect(0, ROOM_HEIGHT - 11, ROOM_WIDTH / 2 - 25, 11);
  ctx.fillRect(ROOM_WIDTH / 2 + 25, ROOM_HEIGHT - 11, ROOM_WIDTH / 2 - 25, 11);
  ctx.fillStyle = rgba("#ffffff", 0.08); ctx.fillRect(10, 0, 1.4, ROOM_HEIGHT); ctx.fillRect(ROOM_WIDTH - 12, 0, 1.4, ROOM_HEIGHT);
  ctx.fillStyle = "#d1bd82"; ctx.fillRect(ROOM_WIDTH / 2 - 25, ROOM_HEIGHT - 13, 50, 5);
  ctx.fillStyle = rgba("#fff0b8", 0.12 + Math.sin(time * 2) * 0.03); ctx.fillRect(ROOM_WIDTH / 2 - 25, ROOM_HEIGHT - 13, 50, 13);
  // Tapete decorativo sem colisão, sob o jogador.
  ctx.fillStyle = "#4d3029"; ctx.fillRect(117, 165, 126, 53);
  ctx.fillStyle = "#6b4238"; ctx.fillRect(119, 167, 122, 49);
  ctx.strokeStyle = "#c6a46b"; ctx.lineWidth = 3; ctx.strokeRect(122, 170, 116, 43);
  ctx.strokeStyle = rgba("#c6a46b", 0.6); ctx.lineWidth = 1; ctx.strokeRect(128, 176, 104, 31);
  for (let i = 0; i < 5; i++) {
    const cx = 148 + i * 16;
    ctx.fillStyle = i % 2 ? "#c6a46b" : "#9b6a52";
    ctx.beginPath(); ctx.moveTo(cx, 184); ctx.lineTo(cx + 6, 191.5); ctx.lineTo(cx, 199); ctx.lineTo(cx - 6, 191.5); ctx.closePath(); ctx.fill();
  }
  for (let i = 0; i < 16; i++) { ctx.fillStyle = "#d8c292"; ctx.fillRect(119 + i * 7.6, 164, 1.4, 3); ctx.fillRect(119 + i * 7.6, 216, 1.4, 3); }
  // Mobília e herói ordenados por profundidade.
  const behind = room.furniture.filter(f => f.y + f.height <= room.player.y);
  const front = room.furniture.filter(f => f.y + f.height > room.player.y);
  for (const f of behind) drawFurniture(ctx, f, palette.wood, time);
  renderHero(ctx, room.player, room.player.x, room.player.y, time);
  for (const f of front) drawFurniture(ctx, f, palette.wood, time);
  // iluminação ambiente: penumbra nos cantos
  const vg = ctx.createRadialGradient(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, ROOM_HEIGHT * 0.3, ROOM_WIDTH / 2, ROOM_HEIGHT / 2, ROOM_WIDTH * 0.62);
  vg.addColorStop(0, rgba("#120a06", 0)); vg.addColorStop(1, rgba("#120a06", 0.34));
  ctx.fillStyle = vg; ctx.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
}
