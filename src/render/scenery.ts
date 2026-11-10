import { hash2 } from "../world/random.ts";
import type { RegionalLandmarkKind } from "../world/regionalLandmarks.ts";
import { landmarkArtVariant, paintRegionalLandmark } from "./regionalLandmarkArt.ts";
import { paintSouthRuin, type RuinLayer } from "./southRuinsArt.ts";
import { ellipse, mix, rgba, softShadow, TAU } from "./draw.ts";

export interface Scenery {
  kind: "tree" | "rock" | "arch" | "sign" | "fire" | "house" | "regional-landmark" | "south-ruin";
  landmarkKind?: RegionalLandmarkKind;
  /** Só `south-ruin`: a ruína sai em duas camadas (fundo e frente) para o herói passar entre elas; `variant` é o índice 0..3. */
  ruinLayer?: Exclude<RuinLayer, "all">;
  x: number;
  y: number;
  variant: number;
}

/**
 * Objetos altos são pintados uma única vez em canvases fora da tela (arte 100%
 * procedural) e carimbados a cada quadro. Isso permite sombreamento rico com
 * gradientes sem custo por quadro, e deixa o vento inclinar copas e troncos.
 */
const RES = 2;
/** Quanto cada camada da ruína é recuada/avançada na ordenação em profundidade (px). */
export const RUIN_BACK_DEPTH = 30;
export const RUIN_FRONT_DEPTH = 6;
interface Sprite { canvas: HTMLCanvasElement; ox: number; oy: number }
const sprites = new Map<string, Sprite | null>();

function sprite(key: string, w: number, h: number, ox: number, oy: number,
  paint: (c: CanvasRenderingContext2D) => void): Sprite | null {
  const hit = sprites.get(key);
  if (hit !== undefined) return hit;
  let made: Sprite | null = null;
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = w * RES; canvas.height = h * RES;
    const c = canvas.getContext("2d");
    if (c) {
      c.scale(RES, RES); c.translate(ox, oy); c.lineJoin = "round";
      paint(c);
      made = { canvas, ox, oy };
    }
  }
  sprites.set(key, made);
  return made;
}
function blit(ctx: CanvasRenderingContext2D, s: Sprite): void {
  ctx.drawImage(s.canvas, -s.ox, -s.oy, s.canvas.width / RES, s.canvas.height / RES);
}
/** Libera os canvases (troca de qualidade/contexto). */
export function clearSceneryCache(): void { sprites.clear(); }

const bucket = (v: number, n: number): number => Math.min(n - 1, Math.max(0, Math.floor(v * n)));

// ---------------------------------------------------------------- árvores
function paintTrunk(c: CanvasRenderingContext2D, pine: boolean): void {
  const w = pine ? 4.6 : 6;
  const g = c.createLinearGradient(-w, 0, w, 0);
  g.addColorStop(0, "#8a7650"); g.addColorStop(0.45, "#5f5237"); g.addColorStop(1, "#33301f");
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(-w, -30); c.lineTo(w, -30);
  c.quadraticCurveTo(w - 0.5, -8, w + 4.4, 1.5);
  c.quadraticCurveTo(0, 3.4, -w - 4.4, 1.5);
  c.quadraticCurveTo(-w + 0.5, -8, -w, -30);
  c.closePath(); c.fill();
  c.strokeStyle = rgba("#20200f", 0.5); c.lineWidth = 0.9;
  for (let i = 0; i < 6; i++) {
    const x = -w + 2 + (i % 3) * 3;
    c.beginPath(); c.moveTo(x, -26 + i * 3.5); c.lineTo(x + (i % 2 ? 1 : -1), -19 + i * 3.5); c.stroke();
  }
  c.strokeStyle = rgba("#b9a77a", 0.45); c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(-w + 1.6, -28); c.lineTo(-w + 2.2, -4); c.stroke();
  // raízes e musgo
  c.strokeStyle = "#3f3b27"; c.lineWidth = 3; c.lineCap = "round";
  c.beginPath(); c.moveTo(-w - 3, 2.6); c.lineTo(-w + 0.5, -2); c.moveTo(w + 3, 2.4); c.lineTo(w - 0.5, -2); c.stroke();
  c.lineCap = "butt";
  ellipse(c, -w + 1.2, -3, 2.4, 3.6, rgba("#7e9e55", 0.7));
  // samambaias na base
  c.strokeStyle = "#8da155"; c.lineWidth = 1;
  for (let i = -3; i <= 3; i++) {
    c.beginPath(); c.moveTo(i * 3, 3);
    c.quadraticCurveTo(i * 5.4, -5 - Math.abs(i), i * 7.2, -1 + Math.abs(i) * 0.6); c.stroke();
  }
}

function paintBroadleaf(c: CanvasRenderingContext2D, b: number): void {
  const j = (i: number, a = 3): number => (hash2(i, b, 991) - 0.5) * 2 * a;
  const lobes: Array<[number, number, number]> = [
    [4 + j(1), -26, 25 + j(2, 2)], [-17 + j(3), -34, 18 + j(4, 2)], [15 + j(5), -42, 20 + j(6, 2)],
    [-3 + j(7), -52, 21 + j(8, 2)], [-18 + j(9), -49, 13], [7 + j(10), -61, 14],
  ];
  // sombra interna profunda sob a copa
  ellipse(c, 2, -22, 28, 14, "#1c3a2e");
  lobes.forEach(([cx, cy, r], i) => {
    const level = Math.max(0, Math.min(1, (-cy - 22) / 42));
    const dark = mix("#1b3a2c", "#3d6844", level), mid = mix("#2b5238", "#69904f", level), lite = mix("#4a7447", "#a6c06c", level);
    ellipse(c, cx + 1.6, cy + 2.6, r, r * 0.88, rgba("#102a21", 0.55));
    const g = c.createRadialGradient(cx - r * 0.38, cy - r * 0.42, r * 0.08, cx, cy, r * 1.08);
    g.addColorStop(0, lite); g.addColorStop(0.5, mid); g.addColorStop(1, dark);
    c.fillStyle = g;
    c.beginPath(); c.ellipse(cx, cy, r, r * 0.88, 0, 0, TAU); c.fill();
    // tufos de folhas nas bordas (silhueta orgânica)
    for (let k = 0; k < 9; k++) {
      const a = hash2(i * 17 + k, b, 311) * TAU;
      const rr = r * (0.82 + hash2(i, k + b * 5, 312) * 0.28);
      const lx = cx + Math.cos(a) * rr * 0.95, ly = cy + Math.sin(a) * rr * 0.84;
      const top = Math.sin(a) < -0.1 && Math.cos(a) < 0.5;
      ellipse(c, lx, ly, 3.4 + (k % 3), 2.8 + (k % 2), top ? lite : k % 2 ? mid : dark, a);
    }
  });
  // folhas individuais iluminadas e sombreadas
  for (let i = 0; i < 46; i++) {
    const lobe = lobes[Math.floor(hash2(i, b, 401) * lobes.length)] ?? lobes[0]!;
    const a = hash2(i, b, 402) * TAU, rr = Math.sqrt(hash2(i, b, 403)) * lobe[2] * 0.85;
    const px = lobe[0] + Math.cos(a) * rr, py = lobe[1] + Math.sin(a) * rr * 0.8;
    const lit = (px < lobe[0] + 3 && py < lobe[1] + 3);
    ellipse(c, px, py, 2.4 + hash2(i, b, 404) * 1.8, 1.6, lit ? rgba("#d3e39a", 0.55) : rgba("#12301f", 0.4), a);
  }
  // flores brancas/rosadas em algumas árvores
  if (b % 3 === 0) {
    for (let i = 0; i < 12; i++) {
      const lobe = lobes[Math.floor(hash2(i, b, 501) * lobes.length)] ?? lobes[0]!;
      const a = hash2(i, b, 502) * TAU, rr = Math.sqrt(hash2(i, b, 503)) * lobe[2] * 0.8;
      ellipse(c, lobe[0] + Math.cos(a) * rr, lobe[1] + Math.sin(a) * rr * 0.8, 1.5, 1.3, i % 2 ? "#f4e3e0" : "#f0c6cf");
    }
  }
}

function paintPine(c: CanvasRenderingContext2D, b: number): void {
  for (let i = 0; i < 5; i++) {
    const w = 25 - i * 4.4, yy = -11 - i * 13, tip = yy - 31;
    const g = c.createLinearGradient(-w, 0, w, 0);
    const t = i / 4;
    g.addColorStop(0, mix("#3f7048", "#6b9b5c", t)); g.addColorStop(0.5, mix("#2b5240", "#4a7c52", t)); g.addColorStop(1, mix("#17332a", "#2b5240", t));
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, tip);
    c.lineTo(w * 0.55, yy - 14); c.lineTo(w * 0.34, yy - 14);
    c.lineTo(w, yy);
    const notches = 6;
    for (let k = 1; k <= notches; k++) {
      const x = w - (k * 2 * w) / notches;
      c.lineTo(x + w / notches, yy - 3.4 + (hash2(k, i + b, 7) - 0.5) * 2);
      c.lineTo(x, yy + (k === notches ? 0 : 1));
    }
    c.lineTo(-w * 0.34, yy - 14); c.lineTo(-w * 0.55, yy - 14);
    c.closePath(); c.fill();
    c.strokeStyle = rgba("#0f261f", 0.55); c.lineWidth = 1;
    c.beginPath(); c.moveTo(-w + 1, yy); c.lineTo(w - 1, yy); c.stroke();
    c.strokeStyle = rgba("#bfe0a0", 0.35); c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(0, tip + 1); c.lineTo(-w * 0.55, yy - 14); c.lineTo(-w + 2, yy - 1); c.stroke();
  }
  ellipse(c, -2, -13 - 5 * 13 + 3, 2, 3, rgba("#e8f2c8", 0.5));
}

// ------------------------------------------------------------------ pedras
function paintRock(c: CanvasRenderingContext2D, b: number): void {
  const j = (i: number): number => (hash2(i, b, 77) - 0.5) * 3;
  const P: Array<[number, number]> = [
    [-14 + j(1), 0], [-15 + j(2), -10 + j(3)], [-7 + j(4), -20 + j(5)], [6 + j(6), -19 + j(7)], [15 + j(8), -9 + j(9)], [13 + j(10), 0],
  ];
  ellipse(c, 2, 1, 19, 5, rgba("#102a21", 0.35));
  c.fillStyle = "#3d4c43";
  c.beginPath(); P.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill();
  const top = c.createLinearGradient(-12, -20, 8, -6);
  top.addColorStop(0, "#c2c4ae"); top.addColorStop(1, "#8d9583");
  c.fillStyle = top;
  c.beginPath(); c.moveTo(P[1]![0], P[1]![1]); c.lineTo(P[2]![0], P[2]![1]); c.lineTo(P[3]![0], P[3]![1]); c.lineTo(1, -6); c.closePath(); c.fill();
  c.fillStyle = "#6f7e70";
  c.beginPath(); c.moveTo(1, -6); c.lineTo(P[3]![0], P[3]![1]); c.lineTo(P[4]![0], P[4]![1]); c.lineTo(P[5]![0], P[5]![1]); c.closePath(); c.fill();
  c.fillStyle = "#56655a";
  c.beginPath(); c.moveTo(P[0]![0], P[0]![1]); c.lineTo(P[1]![0], P[1]![1]); c.lineTo(1, -6); c.lineTo(P[5]![0], P[5]![1]); c.closePath(); c.fill();
  c.strokeStyle = rgba("#1d2b25", 0.6); c.lineWidth = 1;
  c.beginPath(); P.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.stroke();
  c.strokeStyle = rgba("#1d2b25", 0.5);
  c.beginPath(); c.moveTo(-3, -17); c.lineTo(-5, -10); c.lineTo(-2, -6); c.moveTo(8, -12); c.lineTo(5, -8); c.stroke();
  c.strokeStyle = rgba("#ffffff", 0.45);
  c.beginPath(); c.moveTo(P[1]![0] + 1.4, P[1]![1] - 0.6); c.lineTo(P[2]![0] + 0.6, P[2]![1] + 1); c.lineTo(P[3]![0] - 1, P[3]![1] + 0.6); c.stroke();
  ellipse(c, -6, -2.4, 8, 2.8, "#6f8d4f"); ellipse(c, -7, -3.2, 5, 1.6, "#93b261");
  ellipse(c, 11, -1.2, 3, 1.5, "#7a9a58");
  ellipse(c, 17, 0.4, 2.6, 1.7, "#7d8a78"); ellipse(c, -19, 0.8, 2, 1.3, "#6a766a");
}

// -------------------------------------------------------------------- arco
function paintArch(c: CanvasRenderingContext2D): void {
  softShadow(c, 4, 3, 46, 9, 0.34);
  for (const x of [-26, 26]) {
    const g = c.createLinearGradient(x - 12, 0, x + 12, 0);
    g.addColorStop(0, "#b3b69c"); g.addColorStop(0.55, "#8b947f"); g.addColorStop(1, "#505d52");
    c.fillStyle = g; c.fillRect(x - 10, -47, 20, 49);
    for (let i = 0; i < 4; i++) {
      c.fillStyle = i % 2 ? rgba("#2b3a30", 0.28) : rgba("#ffffff", 0.14);
      c.fillRect(x - 10, -47 + i * 12.5, 20, 12);
      c.fillStyle = rgba("#1c2a22", 0.45); c.fillRect(x - 10, -47 + i * 12.5 + 11, 20, 1.2);
      c.fillRect(x + (i % 2 ? -2 : 3), -47 + i * 12.5, 1.2, 12);
    }
    c.fillStyle = "#c3c4a7"; c.fillRect(x - 13, -53, 26, 6);
    c.fillStyle = rgba("#1c2a22", 0.5); c.fillRect(x - 13, -48, 26, 1.2);
    c.fillStyle = "#757f6e"; c.fillRect(x - 12, 0, 24, 3);
  }
  const arc = (cx: number, cy: number, r: number, w: number, col: string): void => {
    c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.arc(cx, cy, r, Math.PI, TAU); c.stroke();
  };
  arc(0, -46, 26, 17, "#44514a"); arc(-1, -48, 26, 12, "#98a283"); arc(-2, -49, 26, 3, "#d4d3b2");
  c.strokeStyle = rgba("#243228", 0.55); c.lineWidth = 1;
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + (i * Math.PI) / 8;
    c.beginPath(); c.moveTo(-1 + Math.cos(a) * 20, -47 + Math.sin(a) * 20); c.lineTo(-1 + Math.cos(a) * 33, -47 + Math.sin(a) * 33); c.stroke();
  }
  c.fillStyle = "#c9c8a8"; c.beginPath(); c.moveTo(-6, -77); c.lineTo(6, -77); c.lineTo(4, -64); c.lineTo(-4, -64); c.closePath(); c.fill();
  c.strokeStyle = rgba("#243228", 0.6); c.stroke();
  // trepadeira e musgo
  c.strokeStyle = "#4d7a42"; c.lineWidth = 2; c.lineCap = "round";
  c.beginPath(); c.moveTo(-34, -2); c.quadraticCurveTo(-39, -22, -31, -38); c.quadraticCurveTo(-27, -46, -22, -52); c.stroke();
  c.beginPath(); c.moveTo(34, -1); c.quadraticCurveTo(38, -14, 33, -26); c.stroke();
  c.lineCap = "butt";
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    ellipse(c, -34 + Math.sin(t * 4) * 4 + t * 12, -3 - t * 48, 3.2, 1.8, i % 2 ? "#6d9a50" : "#4f7d42", t * 3);
  }
  ellipse(c, -34, -51, 6, 2.6, "#5f8c48"); ellipse(c, 30, -53, 5, 2.2, "#6a9650");
  for (const [fx, fy] of [[-37, -30], [-30, -45], [34, -17]] as const) ellipse(c, fx, fy, 1.5, 1.5, "#f2dd9e");
}

// ------------------------------------------------------------------- placa
function paintSign(c: CanvasRenderingContext2D): void {
  softShadow(c, 1, 3, 12, 3.4, 0.3);
  const post = c.createLinearGradient(-2.4, 0, 2.4, 0);
  post.addColorStop(0, "#7d6743"); post.addColorStop(1, "#43362a");
  c.fillStyle = post; c.fillRect(-2.2, -23, 4.4, 26);
  c.fillStyle = "#3a2d22"; c.beginPath(); c.moveTo(-2.2, -24); c.lineTo(0, -26); c.lineTo(2.2, -24); c.closePath(); c.fill();
  const board = c.createLinearGradient(0, -31, 0, -14);
  board.addColorStop(0, "#c39c63"); board.addColorStop(1, "#8f7143");
  c.fillStyle = board;
  c.beginPath();
  c.moveTo(-17, -30); c.lineTo(11, -30); c.lineTo(19, -22.5); c.lineTo(11, -15); c.lineTo(-17, -15); c.closePath(); c.fill();
  c.strokeStyle = rgba("#2c2318", 0.8); c.lineWidth = 1.1; c.stroke();
  c.strokeStyle = rgba("#5b4528", 0.45); c.lineWidth = 0.7;
  for (let i = 1; i < 3; i++) { c.beginPath(); c.moveTo(-16, -30 + i * 5); c.lineTo(10, -30 + i * 5); c.stroke(); }
  c.fillStyle = "#4e3f27";
  c.fillRect(-12, -26, 17, 2); c.fillRect(-12, -22, 11, 1.4); c.fillRect(-12, -19, 14, 1.2);
  for (const [nx, ny] of [[-14.6, -27.4], [-14.6, -17], [11.6, -22.5]] as const) ellipse(c, nx, ny, 1, 1, "#3a3126");
  c.strokeStyle = rgba("#ffffff", 0.4); c.beginPath(); c.moveTo(-16, -29); c.lineTo(10, -29); c.stroke();
}

// -------------------------------------------------------------------- casa
const WALLS = ["#c8b083", "#a58968", "#bcae98"];
const ROOFS = ["#7a4a44", "#4f6a6a", "#756850"];
const TRIMS = ["#5f4636", "#4a3d33", "#593f33"];
const SHUTTERS = ["#4f7a6a", "#7a4f48", "#58708a"];
function paintHouse(c: CanvasRenderingContext2D, v: number): void {
  const wall = WALLS[v % 3] ?? WALLS[0]!, roof = ROOFS[v % 3] ?? ROOFS[0]!, trim = TRIMS[v % 3] ?? TRIMS[0]!, shutter = SHUTTERS[v % 3] ?? SHUTTERS[0]!;
  softShadow(c, 4, 3, 58, 11, 0.38);
  // base de pedra
  for (let i = 0; i < 12; i++) {
    c.fillStyle = i % 2 ? "#7d8279" : "#8d9187";
    c.fillRect(-45 + i * 7.6, -9, 7.6, 10);
    c.fillStyle = rgba("#1c241f", 0.35); c.fillRect(-45 + i * 7.6, -9, 0.9, 10);
  }
  c.fillStyle = rgba("#ffffff", 0.18); c.fillRect(-45, -9, 90, 1.4);
  // parede com gradiente e tábuas/reboco
  const wg = c.createLinearGradient(-44, 0, 44, 0);
  wg.addColorStop(0, mix(wall, "#ffffff", 0.14)); wg.addColorStop(0.55, wall); wg.addColorStop(1, mix(wall, "#10222a", 0.26));
  c.fillStyle = wg; c.fillRect(-44, -58, 88, 50);
  if (v === 1) {
    c.strokeStyle = rgba("#2b1d12", 0.28); c.lineWidth = 1;
    for (let y = -56; y < -9; y += 6) { c.beginPath(); c.moveTo(-44, y); c.lineTo(44, y); c.stroke(); }
  } else {
    for (let i = 0; i < 40; i++) {
      ellipse(c, -42 + hash2(i, v, 5) * 84, -56 + hash2(i, v, 6) * 46, 2.2, 1.2, rgba(i % 2 ? "#ffffff" : "#3b2a1d", 0.07));
    }
    c.fillStyle = trim;
    for (const x of [-44, 41]) c.fillRect(x, -58, 3, 50);
    c.fillRect(-1.5, -58, 3, 14); c.fillRect(-44, -33, 88, 2.6);
    c.strokeStyle = trim; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(-41, -33); c.lineTo(-24, -56); c.moveTo(41, -33); c.lineTo(24, -56); c.stroke();
  }
  // porta em arco
  const dg = c.createLinearGradient(-10, 0, 10, 0);
  dg.addColorStop(0, "#8a6845"); dg.addColorStop(1, "#573d28");
  c.fillStyle = "#3a2a1e"; c.beginPath(); c.moveTo(-12, -8); c.lineTo(-12, -30); c.arc(0, -30, 12, Math.PI, TAU); c.lineTo(12, -8); c.closePath(); c.fill();
  c.fillStyle = dg; c.beginPath(); c.moveTo(-10, -8); c.lineTo(-10, -30); c.arc(0, -30, 10, Math.PI, TAU); c.lineTo(10, -8); c.closePath(); c.fill();
  c.strokeStyle = rgba("#2b1d12", 0.55); c.lineWidth = 1;
  for (const x of [-5, 0, 5]) { c.beginPath(); c.moveTo(x, -8); c.lineTo(x, -39); c.stroke(); }
  c.strokeStyle = "#3f3a36"; c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(-10, -26); c.lineTo(-3, -26); c.moveTo(-10, -15); c.lineTo(-3, -15); c.stroke();
  ellipse(c, 6, -20, 1.6, 1.6, "#e6c882");
  c.fillStyle = "#9a9d92"; c.fillRect(-14, -3, 28, 4); c.fillStyle = "#b7b9ac"; c.fillRect(-14, -3, 28, 1.2);
  // janelas com venezianas, vidros e floreira
  for (const xx of [-30, 26]) {
    c.fillStyle = shutter; c.fillRect(xx - 14, -45, 5, 20); c.fillRect(xx + 9, -45, 5, 20);
    c.fillStyle = rgba("#000000", 0.2);
    for (let i = 0; i < 5; i++) { c.fillRect(xx - 14, -43 + i * 4, 5, 1); c.fillRect(xx + 9, -43 + i * 4, 5, 1); }
    c.fillStyle = trim; c.fillRect(xx - 9, -46, 18, 22);
    const gl = c.createLinearGradient(xx - 7, -44, xx + 7, -26);
    gl.addColorStop(0, "#b6dfd0"); gl.addColorStop(1, "#4f8590");
    c.fillStyle = gl; c.fillRect(xx - 7, -44, 14, 18);
    c.fillStyle = rgba("#ffffff", 0.4);
    c.beginPath(); c.moveTo(xx - 6, -43); c.lineTo(xx - 1, -43); c.lineTo(xx - 6, -33); c.closePath(); c.fill();
    c.fillStyle = trim; c.fillRect(xx - 0.8, -44, 1.6, 18); c.fillRect(xx - 7, -36, 14, 1.6);
    c.fillStyle = "#6a4c35"; c.fillRect(xx - 10, -24, 20, 5);
    c.fillStyle = "#8a6847"; c.fillRect(xx - 10, -24, 20, 1.4);
    for (let i = 0; i < 6; i++) {
      ellipse(c, xx - 8 + i * 3.2, -25.4 - (i % 2), 1.9, 1.7, ["#e9768a", "#f1d86f", "#f4f1e6"][(i + v) % 3] ?? "#e9768a");
      ellipse(c, xx - 8 + i * 3.2, -23, 1.6, 1.2, "#4e8a44");
    }
  }
  // beiral sombreando a parede
  const eave = c.createLinearGradient(0, -58, 0, -49);
  eave.addColorStop(0, rgba("#10201f", 0.5)); eave.addColorStop(1, rgba("#10201f", 0));
  c.fillStyle = eave; c.fillRect(-44, -58, 88, 9);
  // telhado com fileiras de telhas
  const rg = c.createLinearGradient(-54, 0, 54, 0);
  rg.addColorStop(0, mix(roof, "#ffffff", 0.2)); rg.addColorStop(0.5, roof); rg.addColorStop(1, mix(roof, "#0b1d22", 0.4));
  c.fillStyle = rg;
  c.beginPath(); c.moveTo(-57, -56); c.lineTo(0, -99); c.lineTo(57, -56); c.closePath(); c.fill();
  c.save();
  c.beginPath(); c.moveTo(-57, -56); c.lineTo(0, -99); c.lineTo(57, -56); c.closePath(); c.clip();
  for (let r = 0; r < 6; r++) {
    const y = -56 - r * 7.2;
    const off = r % 2 ? 4 : 0;
    for (let x = -60 + off; x < 60; x += 8) {
      c.fillStyle = rgba((x / 8 + r) % 3 ? "#000000" : "#ffffff", (x / 8 + r) % 3 ? 0.1 : 0.08);
      c.beginPath(); c.arc(x + 4, y - 4, 4.3, 0, Math.PI); c.fill();
    }
    c.strokeStyle = rgba("#0f1c19", 0.38); c.lineWidth = 1;
    c.beginPath(); c.moveTo(-60, y); c.lineTo(60, y); c.stroke();
  }
  c.restore();
  c.strokeStyle = "#e4cd9d"; c.lineWidth = 3; c.lineCap = "round";
  c.beginPath(); c.moveTo(-56, -56.4); c.lineTo(0, -98); c.lineTo(56, -56.4); c.stroke();
  c.strokeStyle = rgba("#0f1c19", 0.55); c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(-58, -54.4); c.lineTo(58, -54.4); c.stroke(); c.lineCap = "butt";
  // chaminé de pedra
  c.fillStyle = "#6b5b4e"; c.fillRect(23, -105, 13, 36);
  c.fillStyle = "#85766a"; c.fillRect(23, -105, 5, 36);
  c.fillStyle = rgba("#1a1511", 0.4); for (let i = 0; i < 4; i++) c.fillRect(23, -100 + i * 8, 13, 1);
  c.fillStyle = "#4a3e35"; c.fillRect(21, -109, 17, 5); c.fillStyle = "#867868"; c.fillRect(21, -109, 17, 1.4);
  // lanterna ao lado da porta
  c.strokeStyle = "#3a3026"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(17, -46); c.lineTo(17, -41); c.stroke();
  c.fillStyle = "#3a3026"; c.fillRect(14.4, -41, 5.2, 1.4); c.fillRect(14.4, -31.4, 5.2, 1.4);
  c.fillStyle = "#f0cf84"; c.fillRect(15.2, -39.8, 3.6, 8.4);
}

function paintFireBase(c: CanvasRenderingContext2D): void {
  softShadow(c, 0, 2, 20, 8, 0.4);
  ellipse(c, 0, 0, 16, 8.4, "#2f332b");
  ellipse(c, 0, -1, 14, 7, "#4d453a");
  ellipse(c, 0, -1.4, 10, 4.6, "#1b1613");
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const x = Math.cos(a) * 13.6, y = Math.sin(a) * 6.4;
    ellipse(c, x, y, 4.6, 3.4, "#5a5f53");
    ellipse(c, x - 0.8, y - 1, 3.2, 2, i % 2 ? "#a2a68f" : "#8f947c");
    ellipse(c, x - 1.4, y - 1.6, 1.4, 0.8, rgba("#ffffff", 0.35));
  }
  c.strokeStyle = "#4d3a2a"; c.lineWidth = 4.2; c.lineCap = "round";
  c.beginPath(); c.moveTo(-8, -3); c.lineTo(8, 1.4); c.moveTo(8, -3); c.lineTo(-8, 1.4); c.stroke();
  c.strokeStyle = "#7a5a3b"; c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(-7, -4); c.lineTo(7, 0); c.stroke(); c.lineCap = "butt";
  ellipse(c, 0, -1.6, 6, 2, rgba("#ff7a2d", 0.6));
}

function flame(ctx: CanvasRenderingContext2D, t: number, scale: number, col: string, phase: number, hgt: number): void {
  const f = Math.sin(t * 9 + phase) * 2 * scale, f2 = Math.sin(t * 13 + phase * 2) * 1.5 * scale;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(-8 * scale, -1.5);
  ctx.quadraticCurveTo(-11 * scale + f2, -10 * scale, -3 * scale + f * 0.6, -hgt * scale - f);
  ctx.quadraticCurveTo(-1 * scale, -11 * scale, 3 * scale + f2, -hgt * 0.78 * scale);
  ctx.quadraticCurveTo(10 * scale + f2, -8 * scale, 8 * scale, -1.5);
  ctx.closePath(); ctx.fill();
}

// ------------------------------------------------------------ renderização
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
  const flip = hash2(Math.floor(prop.x), Math.floor(prop.y), 3) < 0.5 ? -1 : 1;
  if (prop.kind === "tree") {
    const pine = prop.variant > 0.9;
    const b = pine ? 9 : bucket(prop.variant / 0.9, 9);
    const scale = 0.86 + prop.variant * 0.24;
    const wind = Math.sin(time * 1.15 + prop.x * 0.013) * 0.6 + Math.sin(time * 2.7 + prop.y * 0.021) * 0.4;
    const k = wind * 0.03 + 0.008;
    ctx.scale(scale * flip, scale);
    const trunk = sprite("trunk" + (pine ? "p" : "b"), 50, 46, 25, 40, (c) => paintTrunk(c, pine));
    const crown = sprite("crown" + b, 120, 140, 60, 108, (c) => pine ? paintPine(c, b) : paintBroadleaf(c, b));
    if (trunk && crown) {
      ctx.save(); ctx.transform(1, 0, k * 0.35, 1, 0, 0); blit(ctx, trunk); ctx.restore();
      ctx.save();
      ctx.translate(-k * 0.35 * 22, 0);
      ctx.translate(0, -22); ctx.transform(1, 0, k, 1, 0, 0); ctx.translate(0, 22);
      blit(ctx, crown);
      ctx.restore();
    } else {
      const c2 = ctx; paintTrunk(c2, pine); if (pine) paintPine(c2, b); else paintBroadleaf(c2, b);
    }
  } else if (prop.kind === "house") {
    const v = Math.abs(Math.floor(prop.variant)) % 3;
    const s = sprite("house" + v, 128, 130, 64, 116, (c) => paintHouse(c, v));
    if (s) blit(ctx, s); else paintHouse(ctx, v);
    // brilho quente na janela e na lanterna (leve cintilação) e fumaça da chaminé
    const flick = 0.5 + 0.5 * Math.sin(time * 2.3 + v);
    ctx.fillStyle = rgba("#ffd98a", 0.07 + flick * 0.07);
    ctx.fillRect(-37, -44, 14, 18); ctx.fillRect(19, -44, 14, 18);
    const lg = ctx.createRadialGradient(17, -36, 1, 17, -36, 20);
    lg.addColorStop(0, rgba("#ffd98a", 0.4 + flick * 0.12)); lg.addColorStop(1, rgba("#ffd98a", 0));
    ctx.fillStyle = lg; ctx.fillRect(-4, -56, 42, 40);
    for (let i = 0; i < 4; i++) {
      const p = (time * 0.32 + i / 4 + v * 0.13) % 1;
      const px = 29.5 + Math.sin(p * 5 + i * 2) * 4 + p * 12, py = -111 - p * 36;
      ellipse(ctx, px, py, 3 + p * 6.5, 2.6 + p * 5.5, rgba("#e6e4da", (1 - p) * 0.4));
    }
  } else if (prop.kind === "rock") {
    const b = bucket(prop.variant, 6);
    const s = sprite("rock" + b, 64, 44, 32, 36, (c) => paintRock(c, b));
    const sc = 0.82 + ((prop.variant * 37) % 1) * 0.5;
    ctx.scale(sc * flip, sc);
    if (s) blit(ctx, s); else paintRock(ctx, b);
  } else if (prop.kind === "regional-landmark" && prop.landmarkKind) {
    const kind = prop.landmarkKind, variation = landmarkArtVariant(prop.variant);
    // Four bounded visual variations per kind; painting stays off the frame loop.
    const s = sprite("regional-" + kind + "-" + variation, 96, 128, 48, 102,
      (c) => paintRegionalLandmark(c, kind, variation));
    if (s) blit(ctx, s); else paintRegionalLandmark(ctx, kind, variation);
  } else if (prop.kind === "south-ruin" && prop.ruinLayer) {
    const layer = prop.ruinLayer, v = Math.max(0, Math.min(3, Math.floor(prop.variant)));
    // O desenho usa o contato da ruína como origem; cada camada é ordenada em uma altura própria.
    ctx.translate(0, layer === "back" ? RUIN_BACK_DEPTH : -RUIN_FRONT_DEPTH);
    const s = sprite("south-ruin-" + v + "-" + layer, 232, 168, 116, 112, (c) => paintSouthRuin(c, v, layer));
    if (s) blit(ctx, s); else paintSouthRuin(ctx, v, layer);
  } else if (prop.kind === "arch") {
    const s = sprite("arch", 120, 100, 60, 82, paintArch);
    if (s) blit(ctx, s); else paintArch(ctx);
    const pulse = 0.5 + 0.5 * Math.sin(time * 1.8);
    const g = ctx.createRadialGradient(0, -70, 1, 0, -70, 14);
    g.addColorStop(0, rgba("#a6f0ff", 0.18 + pulse * 0.4)); g.addColorStop(1, rgba("#a6f0ff", 0));
    ctx.fillStyle = g; ctx.fillRect(-14, -84, 28, 28);
  } else if (prop.kind === "sign") {
    const s = sprite("sign", 48, 44, 24, 34, paintSign);
    if (s) blit(ctx, s); else paintSign(ctx);
  } else {
    const s = sprite("firebase", 48, 28, 24, 16, paintFireBase);
    if (s) blit(ctx, s); else paintFireBase(ctx);
    const flicker = 0.75 + Math.sin(time * 11) * 0.1 + Math.sin(time * 17.3) * 0.07;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const glow = ctx.createRadialGradient(0, -8, 2, 0, -8, 56);
    glow.addColorStop(0, rgba("#ff8a3a", 0.34 * flicker)); glow.addColorStop(0.5, rgba("#ff6a2a", 0.11 * flicker)); glow.addColorStop(1, rgba("#ff6a2a", 0));
    ctx.fillStyle = glow; ctx.fillRect(-56, -64, 112, 112);
    ctx.restore();
    flame(ctx, time, 1.1, "#c8451f", 0, 21);
    flame(ctx, time, 0.86, "#f08a2c", 1.7, 20);
    flame(ctx, time, 0.56, "#ffd26a", 3.1, 19);
    ellipse(ctx, 0, -4, 2.4, 4.4, "#fff3b0");
    for (let i = 0; i < 6; i++) {
      const p = (time * 0.9 + i / 6) % 1;
      const ex = Math.sin(i * 7.1 + time * 2) * 7 * p, ey = -8 - p * 38;
      ellipse(ctx, ex, ey, 1.1 * (1 - p) + 0.3, 1.1 * (1 - p) + 0.3, rgba("#ffb25a", (1 - p) * 0.9));
    }
    for (let i = 0; i < 3; i++) {
      const p = (time * 0.4 + i / 3) % 1;
      ellipse(ctx, Math.sin(p * 4 + i) * 6 + p * 5, -26 - p * 30, 3 + p * 6, 2.4 + p * 4.4, rgba("#6c6a66", (1 - p) * 0.2));
    }
  }
  ctx.restore();
}
