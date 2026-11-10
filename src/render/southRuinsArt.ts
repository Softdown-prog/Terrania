import { hash2 } from "../world/random.ts";
import { RUIN_PIECES, type RuinPiece, type RuinVariant } from "../world/southRuins.ts";
import { ellipse, rgba, shade, softShadow, TAU } from "./draw.ts";

/**
 * Ruínas abandonadas do Sul (ADR 0017). Arte pura: posição, nome e colisão ficam em
 * `world/southRuins.ts`, e este arquivo desenha as MESMAS peças (`RUIN_PIECES`) a partir do
 * ponto de contato (0,0). Pintada uma vez em canvas de cache (`scenery.ts`): sem sorteio nem
 * gradiente novo no laço do jogo; toda variação vem de `hash2`. A luz vem da esquerda e de cima.
 */
type Ramp = { readonly light: string; readonly base: string; readonly dark: string };
const SANDSTONE: Ramp = { light: "#e8d0a0", base: "#bf9f6c", dark: "#7b5f40" };
const MUDBRICK: Ramp = { light: "#dba372", base: "#b27c4e", dark: "#704c32" };
const SAND: Ramp = { light: "#ecd29a", base: "#d3b377", dark: "#a07f4d" };
const CLAY: Ramp = { light: "#d98b5b", base: "#a8613a", dark: "#6a3a24" };
const CLOTH: Ramp = { light: "#8f3d62", base: "#5e2440", dark: "#36142a" };
const OUTLINE = "#142a2a";
const GLINT = "#fff6dc";
const BONE = "#efe3c8";
const OCHRE = "#c98a3a";
const GLAZE = { light: "#5fb0a6", dark: "#2f6f73" } as const;
const SCRUB = { base: "#6f7a4a", dry: "#a39a63" } as const;

export type RuinLayer = "all" | "back" | "front";
const noise = (i: number, v: number, salt: number): number => hash2(i + 17, v * 31 + 3, salt);
const isTall = (piece: RuinPiece): boolean =>
  piece.kind === "column" || piece.kind === "wall" || piece.kind === "pillar" || piece.kind === "oven";
/** Peças altas cuja base termina antes de y=-14 ficam ao fundo; o herói passa à frente delas. */
export const ruinLayerOf = (piece: RuinPiece): "back" | "front" =>
  !isTall(piece) || piece.y + piece.h / 2 <= -14 ? "back" : "front";

function volume(c: CanvasRenderingContext2D, x0: number, x1: number, ramp: Ramp): CanvasGradient {
  const g = c.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, ramp.light); g.addColorStop(0.42, ramp.base); g.addColorStop(1, ramp.dark);
  return g;
}
function poly(c: CanvasRenderingContext2D, pts: ReadonlyArray<readonly [number, number]>): void {
  c.beginPath(); c.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i]![0], pts[i]![1]);
  c.closePath();
}
function line(c: CanvasRenderingContext2D, pts: ReadonlyArray<readonly [number, number]>,
  color: string, width = 1): void {
  c.beginPath(); c.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i]![0], pts[i]![1]);
  c.strokeStyle = color; c.lineWidth = width; c.stroke();
}
/** Escurece onde a peça encontra o chão (oclusão ambiente). */
function occlusion(c: CanvasRenderingContext2D, x: number, y: number, w: number): void {
  const g = c.createLinearGradient(0, y - 7, 0, y + 1);
  g.addColorStop(0, rgba("#2c1f14", 0)); g.addColorStop(1, rgba("#2c1f14", 0.42));
  c.fillStyle = g; c.fillRect(x - w / 2, y - 7, w, 8);
}
function drift(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, v: number, i: number): void {
  ellipse(c, x + 1, y + 1, rx, ry, rgba(SAND.dark, 0.35));
  ellipse(c, x, y, rx, ry, rgba(SAND.base, 0.95));
  ellipse(c, x - rx * 0.18, y - ry * 0.25, rx * 0.7, ry * 0.55, rgba(SAND.light, 0.9 - noise(i, v, 7) * 0.2));
}

/** Parede de tijolo/pedra com topo quebrado: o perfil do topo vem de `hash2`. */
function wall(c: CanvasRenderingContext2D, piece: RuinPiece, v: number, idx: number,
  ramp: Ramp, glints: Array<() => void>): void {
  const hw = piece.w / 2, depth = Math.max(6, piece.h * 0.55);
  const x0 = piece.x - hw, x1 = piece.x + hw, yb = piece.y + piece.h / 2;
  const tallest = v === 2 ? 46 : v === 3 ? 34 : 38;
  const n = Math.max(2, Math.round(piece.w / 9));
  const top: Array<readonly [number, number]> = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n, edge = Math.min(k, 1 - k) * 2;
    const h = tallest * (0.42 + 0.58 * noise(i + idx * 9, v, 31)) * (0.7 + 0.3 * edge) + (piece.h > 20 ? 6 : 0);
    top.push([x0 + piece.w * k, yb - Math.max(10, h)]);
  }
  softShadow(c, piece.x + 9, yb + 2, piece.w * 0.62 + 10, 5, 0.34);
  // topo (face superior) atrás da face frontal
  const lift: Array<readonly [number, number]> = top.map(([x, y]) => [x + depth * 0.35, y - depth * 0.5] as const);
  poly(c, [...top, ...[...lift].reverse()]);
  c.fillStyle = shade(ramp.light, 0.08); c.fill();
  // face frontal com volume
  poly(c, [[x0, yb], ...top, [x1, yb]]);
  c.fillStyle = volume(c, x0, x1, ramp); c.fill();
  // lateral direita, mais escura
  poly(c, [[x1, yb], top[n]!, lift[n]!, [x1 + depth * 0.35, yb - depth * 0.5]]);
  c.fillStyle = shade(ramp.dark, -0.1); c.fill();
  // material recortado na silhueta: fiadas deslocadas e tijolos de tom próprio
  c.save();
  poly(c, [[x0, yb], ...top, [x1, yb]]); c.clip();
  const course = v === 3 ? 7 : 9;
  for (let j = 0, y = yb - course; y > yb - 56; j++, y -= course) {
    line(c, [[x0, y], [x1, y]], rgba(ramp.dark, 0.5), 0.9);
    for (let x = x0 + (j % 2 ? 4 : 11); x < x1; x += course * 1.9) {
      line(c, [[x, y], [x - 0.5, y + course]], rgba(ramp.dark, 0.45), 0.8);
      if (noise(Math.floor(x) + j * 7, v, 41) > 0.72)
        c.fillStyle = rgba(ramp.light, 0.22), c.fillRect(x + 1, y + 1, course * 1.6, course - 2);
    }
  }
  for (let i = 0; i < 4; i++) {
    const cx = x0 + noise(i + idx, v, 43) * piece.w, cy = yb - 6 - noise(i + idx, v, 47) * 22;
    line(c, [[cx, cy], [cx + 2, cy - 4], [cx - 1, cy - 8]], rgba("#2c1f14", 0.6), 0.9);
  }
  occlusion(c, piece.x, yb, piece.w);
  c.restore();
  // contorno único e brilho da quina esquerda
  poly(c, [[x0, yb], ...top, [x1, yb]]); c.strokeStyle = OUTLINE; c.lineWidth = 1.1; c.stroke();
  glints.push(() => line(c, top.slice(0, 3).map(([x, y]) => [x + 0.8, y + 1] as const), rgba(GLINT, 0.7), 1));
  for (let i = 0; i < 2; i++) drift(c, x0 + noise(i + idx, v, 53) * piece.w, yb + 1, 8 + noise(i, v, 59) * 6, 2.5, v, i + idx);
}

/** Coluna de fuste canelado: inteira, quebrada em ponta ou reduzida a um toco. */
function column(c: CanvasRenderingContext2D, piece: RuinPiece, v: number, idx: number,
  ramp: Ramp, glints: Array<() => void>): void {
  const r = piece.w / 2, yb = piece.y + piece.h / 2 - 1;
  const roll = noise(idx, v, 61);
  const state = roll < 0.28 ? "stump" : roll < 0.62 ? "broken" : "full";
  const height = state === "stump" ? 14 + noise(idx, v, 67) * 8 : state === "broken" ? 34 + noise(idx, v, 71) * 14 : 66;
  softShadow(c, piece.x + height * 0.22, yb + 1, r * 2.2 + height * 0.22, 4.5, 0.36);
  // plinto
  c.fillStyle = volume(c, piece.x - r - 3, piece.x + r + 3, ramp);
  c.fillRect(piece.x - r - 3, yb - 6, piece.w + 6, 6);
  line(c, [[piece.x - r - 3, yb - 6], [piece.x + r + 3, yb - 6]], rgba(ramp.light, 0.9), 1);
  // fuste com leve afinamento (curvas) e topo conforme o estado
  const topY = yb - 6 - height, lean = state === "broken" ? (noise(idx, v, 73) - 0.5) * 4 : 0;
  const shaft = (): void => {
    c.beginPath();
    c.moveTo(piece.x - r, yb - 6);
    c.quadraticCurveTo(piece.x - r + 0.8, yb - 6 - height / 2, piece.x - r + 0.6, topY);
    if (state === "broken") {
      c.lineTo(piece.x - r * 0.3 + lean, topY - 4); c.lineTo(piece.x + r * 0.2 + lean, topY + 2);
      c.lineTo(piece.x + r * 0.7, topY - 5); c.lineTo(piece.x + r - 0.6, topY);
    } else c.lineTo(piece.x + r - 0.6, topY);
    c.quadraticCurveTo(piece.x + r - 0.8, yb - 6 - height / 2, piece.x + r, yb - 6);
    c.closePath();
  };
  shaft(); c.fillStyle = volume(c, piece.x - r, piece.x + r, ramp); c.fill();
  c.save(); shaft(); c.clip();
  for (const dx of [-0.55, 0, 0.55]) line(c, [[piece.x + dx * r, topY], [piece.x + dx * r, yb - 6]], rgba(ramp.dark, 0.38), 0.8);
  for (let y = yb - 14; y > topY; y -= 15 + noise(Math.floor(y), v, 79) * 6)
    line(c, [[piece.x - r, y], [piece.x + r, y + 1]], rgba(ramp.dark, 0.5), 0.9);
  occlusion(c, piece.x, yb - 6, piece.w + 6);
  c.restore();
  shaft(); c.strokeStyle = OUTLINE; c.lineWidth = 1.1; c.stroke();
  if (state === "full") {
    // capitel: laje e coxim, com o coxim mais claro à esquerda
    c.fillStyle = volume(c, piece.x - r - 3, piece.x + r + 3, ramp);
    c.fillRect(piece.x - r - 3, topY - 5, piece.w + 6, 5);
    ellipse(c, piece.x, topY - 5, r + 3, 2.4, shade(ramp.light, 0.1));
    c.fillStyle = rgba(OCHRE, 0.85); c.fillRect(piece.x - r - 3, topY - 3, piece.w + 6, 1.6); // pigmento que restou
    c.strokeStyle = OUTLINE; c.lineWidth = 1; c.strokeRect(piece.x - r - 3, topY - 5, piece.w + 6, 5);
  } else {
    ellipse(c, piece.x - 0.5 + lean, topY + 0.5, r - 1, 2.1, rgba(ramp.light, 0.65));
    ellipse(c, piece.x + 2, topY + 1, r * 0.4, 1.2, rgba("#2c1f14", 0.35));
  }
  glints.push(() => line(c, [[piece.x - r + 1.6, yb - 10], [piece.x - r + 1.6, topY + 3]], rgba(GLINT, 0.6), 1));
}

/** Pilar do vão da porta. O do lado esquerdo sustenta o que sobrou do arco. */
function pillar(c: CanvasRenderingContext2D, piece: RuinPiece, idx: number,
  ramp: Ramp, glints: Array<() => void>): void {
  const hw = piece.w / 2, yb = piece.y + piece.h / 2, height = 60 + (idx % 2) * 4;
  softShadow(c, piece.x + 8, yb + 1, 16, 4.5, 0.36);
  c.fillStyle = volume(c, piece.x - hw, piece.x + hw, ramp);
  c.fillRect(piece.x - hw, yb - height, piece.w, height);
  c.save(); c.beginPath(); c.rect(piece.x - hw, yb - height, piece.w, height); c.clip();
  for (let y = yb - 8; y > yb - height; y -= 8) line(c, [[piece.x - hw, y], [piece.x + hw, y]], rgba(ramp.dark, 0.5), 0.9);
  occlusion(c, piece.x, yb, piece.w);
  c.restore();
  c.strokeStyle = OUTLINE; c.lineWidth = 1.1; c.strokeRect(piece.x - hw, yb - height, piece.w, height);
  glints.push(() => line(c, [[piece.x - hw + 1.4, yb - 4], [piece.x - hw + 1.4, yb - height + 2]], rgba(GLINT, 0.6), 1));
  if (piece.x < 0) {
    // arco quebrado: faixa curva entre dois raios, só a metade esquerda sobreviveu
    const cx = 0, cy = yb - height + 1, outer = 36, inner = 24;
    c.beginPath(); c.arc(cx, cy, outer, Math.PI, Math.PI * 1.66); c.arc(cx, cy, inner, Math.PI * 1.66, Math.PI, true); c.closePath();
    c.fillStyle = volume(c, -outer, 6, ramp); c.fill();
    // fiadas radiais do arco, recortadas na faixa
    c.save(); c.clip();
    for (let a = Math.PI + 0.12; a < Math.PI * 1.66; a += 0.2)
      line(c, [[cx + Math.cos(a) * inner, cy + Math.sin(a) * inner], [cx + Math.cos(a) * outer, cy + Math.sin(a) * outer]], rgba(ramp.dark, 0.55), 0.9);
    c.restore();
    c.beginPath(); c.arc(cx, cy, outer, Math.PI, Math.PI * 1.66); c.arc(cx, cy, inner, Math.PI * 1.66, Math.PI, true); c.closePath();
    c.strokeStyle = OUTLINE; c.lineWidth = 1.1; c.stroke();
    glints.push(() => { c.beginPath(); c.arc(cx, cy, outer - 1.2, Math.PI * 1.04, Math.PI * 1.4); c.strokeStyle = rgba(GLINT, 0.6); c.lineWidth = 1; c.stroke(); });
  } else {
    // pano de estandarte rasgado preso ao pilar direito, em vinho desbotado com bainha dourada
    const bx = piece.x - hw + 1, by = yb - height + 8;
    poly(c, [[bx, by], [bx - 11, by + 1], [bx - 12, by + 22], [bx - 8, by + 19], [bx - 5, by + 27], [bx - 2, by + 21], [bx, by + 30]]);
    c.fillStyle = volume(c, bx - 12, bx, CLOTH); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 1; c.stroke();
    line(c, [[bx - 11, by + 3], [bx - 1, by + 3]], rgba("#d9a24a", 0.9), 1.2);
    line(c, [[bx - 7, by + 4], [bx - 8, by + 18]], rgba(CLOTH.dark, 0.7), 0.9);
  }
}

function oven(c: CanvasRenderingContext2D, piece: RuinPiece, glints: Array<() => void>): void {
  const yb = piece.y + piece.h / 2, rx = piece.w / 2;
  softShadow(c, piece.x + 6, yb + 1, rx + 8, 4, 0.34);
  const dome = (): void => { c.beginPath(); c.ellipse(piece.x, yb, rx, 17, 0, Math.PI, 0); c.lineTo(piece.x + rx, yb); c.closePath(); };
  dome(); c.fillStyle = volume(c, piece.x - rx, piece.x + rx, MUDBRICK); c.fill();
  c.save(); dome(); c.clip();
  for (let k = 1; k < 4; k++) { c.beginPath(); c.ellipse(piece.x, yb, rx, 17 * k / 4, 0, Math.PI, 0); c.strokeStyle = rgba(MUDBRICK.dark, 0.45); c.lineWidth = 0.9; c.stroke(); }
  occlusion(c, piece.x, yb, piece.w); c.restore();
  ellipse(c, piece.x - 2, yb - 5, 6, 5, rgba("#1e1410", 0.92));
  ellipse(c, piece.x - 2, yb - 10, 6, 3, rgba("#2c1f14", 0.4));
  dome(); c.strokeStyle = OUTLINE; c.lineWidth = 1.1; c.stroke();
  glints.push(() => { c.beginPath(); c.ellipse(piece.x, yb, rx - 2, 15, 0, Math.PI * 1.05, Math.PI * 1.35); c.strokeStyle = rgba(GLINT, 0.55); c.lineWidth = 1; c.stroke(); });
}

/** Degraus (colunata e templo), piso de lajes (torre) ou piso de barro batido (muralha). */
function floor(c: CanvasRenderingContext2D, piece: RuinPiece, v: number): void {
  if (v === 2) {
    const rx = piece.w / 2 * 0.74, ry = piece.h / 2 * 0.74;
    ellipse(c, piece.x + 2, piece.y + 2, rx + 4, ry + 3, rgba("#3a2a1c", 0.28));
    ellipse(c, piece.x, piece.y, rx + 3, ry + 2, shade(SANDSTONE.dark, 0.05));
    ellipse(c, piece.x, piece.y, rx, ry, SANDSTONE.base);
    c.save(); c.beginPath(); c.ellipse(piece.x, piece.y, rx, ry, 0, 0, TAU); c.clip();
    for (let k = 1; k <= 3; k++) { c.beginPath(); c.ellipse(piece.x, piece.y, rx * k / 3.4, ry * k / 3.4, 0, 0, TAU); c.strokeStyle = rgba(SANDSTONE.dark, 0.4); c.lineWidth = 0.9; c.stroke(); }
    for (let a = 0; a < 9; a++) line(c, [[piece.x, piece.y], [piece.x + Math.cos(a * TAU / 9) * rx, piece.y + Math.sin(a * TAU / 9) * ry]], rgba(SANDSTONE.dark, 0.35), 0.9);
    ellipse(c, piece.x - rx * 0.4, piece.y - ry * 0.35, rx * 0.5, ry * 0.4, rgba(SANDSTONE.light, 0.25));
    for (let i = 0; i < 6; i++) drift(c, piece.x + (noise(i, v, 83) - 0.5) * rx * 1.6, piece.y + (noise(i, v, 89) - 0.3) * ry * 1.4, 7, 2.4, v, i);
    c.restore();
    c.beginPath(); c.ellipse(piece.x, piece.y, rx + 3, ry + 2, 0, 0, TAU); c.strokeStyle = OUTLINE; c.lineWidth = 1; c.stroke();
  } else if (v === 3) {
    const x0 = piece.x - piece.w / 2 + 6, x1 = piece.x + piece.w / 2 - 6, y0 = piece.y - piece.h / 2 + 4, y1 = piece.y + piece.h / 2 - 2;
    poly(c, [[x0 + 8, y0], [x1 - 6, y0], [x1, y1], [x0, y1]]);
    c.fillStyle = rgba(CLAY.base, 0.46); c.fill();
    c.save(); poly(c, [[x0 + 8, y0], [x1 - 6, y0], [x1, y1], [x0, y1]]); c.clip();
    for (let k = 1; k < 4; k++) line(c, [[x0 + 8 - k * 2, y0 + (y1 - y0) * k / 4], [x1 - 6 + k * 1.5, y0 + (y1 - y0) * k / 4]], rgba(CLAY.dark, 0.35), 0.9);
    for (let k = 1; k < 9; k++) line(c, [[x0 + 8 + (x1 - x0 - 14) * k / 9, y0], [x0 + (x1 - x0) * k / 9, y1]], rgba(CLAY.dark, 0.28), 0.9);
    for (let i = 0; i < 9; i++) drift(c, x0 + noise(i, v, 97) * (x1 - x0), y0 + noise(i, v, 101) * (y1 - y0), 12 + noise(i, v, 99) * 8, 3, v, i);
    c.restore();
    poly(c, [[x0 + 8, y0], [x1 - 6, y0], [x1, y1], [x0, y1]]);
    c.strokeStyle = rgba(CLAY.dark, 0.55); c.lineWidth = 1; c.stroke();
  } else {
    // dois degraus largos: piso mais claro, espelho mais escuro, quinas lascadas
    for (let k = 0; k < 2; k++) {
      const w = piece.w - k * 18, y = piece.y - k * 6 + 3, x0 = piece.x - w / 2;
      c.fillStyle = volume(c, x0, x0 + w, SANDSTONE); c.fillRect(x0, y, w, 6);
      c.fillStyle = rgba(SANDSTONE.light, 0.9); c.fillRect(x0, y - 4, w, 4);
      for (let x = x0 + 10; x < x0 + w - 4; x += 22 + noise(Math.floor(x), v, 103) * 8) line(c, [[x, y - 4], [x, y + 6]], rgba(SANDSTONE.dark, 0.5), 0.9);
      c.strokeStyle = OUTLINE; c.lineWidth = 1; c.strokeRect(x0, y - 4, w, 10);
      occlusion(c, piece.x, y + 6, w);
    }
  }
}

/** Tambor de coluna caído: cilindro deitado, de tamanho e inclinação fixos por sorteio. */
function drum(c: CanvasRenderingContext2D, piece: RuinPiece, v: number, idx: number): void {
  const r = piece.h / 2 - 1, yb = piece.y + 2;
  c.save(); c.translate(piece.x, yb); c.rotate((noise(idx, v, 107) - 0.5) * 0.4);
  softShadow(c, 3, r + 1, piece.w * 0.7, 3.2, 0.34);
  c.fillStyle = volume(c, -piece.w / 2, piece.w / 2, SANDSTONE); c.fillRect(-piece.w / 2, -r, piece.w, r * 2);
  ellipse(c, -piece.w / 2, 0, 2.6, r, SANDSTONE.light); ellipse(c, piece.w / 2, 0, 2.6, r, SANDSTONE.dark);
  ellipse(c, -piece.w / 2, 0, 1.2, r * 0.55, rgba(SANDSTONE.dark, 0.7));
  line(c, [[-piece.w / 2, -r], [piece.w / 2, -r]], OUTLINE, 1); line(c, [[-piece.w / 2, r], [piece.w / 2, r]], OUTLINE, 1);
  line(c, [[-piece.w / 2 + 2, -r + 1.5], [piece.w / 2 - 3, -r + 1.5]], rgba(GLINT, 0.5), 0.9);
  c.restore();
}

function pot(c: CanvasRenderingContext2D, piece: RuinPiece, idx: number): void {
  const x = piece.x, y = piece.y, big = idx % 2 === 0;
  softShadow(c, x + 2, y + 3, 8, 2.4, 0.3);
  ellipse(c, x, y - 4, big ? 5.4 : 4.6, big ? 5.6 : 4.8, volume(c, x - 6, x + 6, CLAY));
  c.fillStyle = CLAY.base; c.fillRect(x - 2.2, y - 11, 4.4, 4);
  ellipse(c, x, y - 11, 3.4, 1.3, CLAY.light);
  ellipse(c, x, y - 11, 2.1, 0.7, rgba("#1e1410", 0.8));
  ellipse(c, x - 1.8, y - 6, 1.2, 2, rgba(GLINT, 0.5));
  c.beginPath(); c.ellipse(x, y - 4, big ? 5.4 : 4.6, big ? 5.6 : 4.8, 0, 0, TAU); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
}

/** Chão em volta: areia acumulada, seixos, tufos secos e, na torre, ossos de quem ficou. */
function groundDetail(c: CanvasRenderingContext2D, v: number): void {
  for (let i = 0; i < 10; i++) {
    const a = noise(i, v, 109) * TAU, d = 40 + noise(i, v, 113) * 70;
    drift(c, Math.cos(a) * d * 1.1, 10 + Math.sin(a) * d * 0.3, 8 + noise(i, v, 117) * 12, 2.4 + noise(i, v, 121) * 1.4, v, i);
  }
  for (let i = 0; i < 12; i++) {
    const x = (noise(i, v, 127) - 0.5) * 200, y = -20 + noise(i, v, 131) * 66, s = 1 + noise(i, v, 137) * 1.8;
    ellipse(c, x + 0.8, y + 0.8, s * 1.3, s * 0.6, rgba("#2c1f14", 0.3));
    ellipse(c, x, y, s, s * 0.6, i % 3 ? SANDSTONE.base : SANDSTONE.light);
  }
  for (let i = 0; i < 5; i++) {
    const x = (noise(i, v, 139) - 0.5) * 190, y = 4 + noise(i, v, 149) * 36;
    for (const k of [-2, 0, 2]) line(c, [[x + k, y], [x + k * 1.8, y - 5 - noise(i + k, v, 151) * 3]], rgba("#8a7a46", 0.85), 0.9);
  }
  for (let i = 0; i < 2; i++) {
    // arbusto seco: poucos ramos tortos, um verde apagado e outro palha
    const x = (noise(i, v, 153) - 0.5) * 170, y = 18 + noise(i, v, 157) * 30;
    for (let k = -2; k <= 2; k++) line(c, [[x, y], [x + k * 2.6, y - 7 - Math.abs(k) * -0.8 - noise(i + k, v, 159) * 4]], k % 2 ? SCRUB.base : SCRUB.dry, 1.1);
  }
  if (v === 0 || v === 1) {
    // cacos de azulejo esmaltado, desbotados pelo sol, caídos entre os degraus
    for (let i = 0; i < 4; i++) {
      const x = -44 + i * 26 + (noise(i, v, 163) - 0.5) * 10, y = 34 + noise(i, v, 167) * 8;
      poly(c, [[x, y], [x + 4, y - 1], [x + 5, y + 2.4], [x - 0.5, y + 3]]);
      c.fillStyle = i % 2 ? GLAZE.light : GLAZE.dark; c.fill(); c.strokeStyle = rgba(OUTLINE, 0.7); c.lineWidth = 0.7; c.stroke();
    }
  }
  if (v === 2) {
    for (let k = 0; k < 4; k++) {
      c.beginPath(); c.arc(-84 + k * 3, 36, 5 + k * 0.4, Math.PI * 1.1, Math.PI * 1.95);
      c.strokeStyle = rgba(BONE, 0.95); c.lineWidth = 1.3; c.stroke();
    }
    ellipse(c, -92, 38, 3.4, 2.6, BONE); ellipse(c, -93, 37, 0.9, 0.9, rgba("#1e1410", 0.85));
  }
}

/**
 * Pinta uma ruína no ponto de contato (0,0), até ~112 px de cada lado e ~100 px de altura.
 * `layer`: "back" desenha o chão e as peças altas do fundo; "front" desenha as da frente,
 * para o herói passar entre as duas; "all" desenha tudo (registro de arte e prévia).
 */
export function paintSouthRuin(c: CanvasRenderingContext2D, variant: number, layer: RuinLayer = "all"): void {
  const v = (Number.isFinite(variant) ? Math.max(0, Math.min(3, Math.floor(variant))) : 0) as RuinVariant;
  const ramp = v === 3 ? MUDBRICK : SANDSTONE;
  const pieces = RUIN_PIECES[v].map((piece, idx) => ({ piece, idx }));
  const glints: Array<() => void> = [];
  c.save();
  if (layer !== "front") {
    // 1. sombra de contato de toda a pegada, antes de qualquer forma
    softShadow(c, 4, 10, 112, 24, 0.3);
    groundDetail(c, v);
    for (const { piece, idx } of pieces) {
      if (piece.kind === "steps") floor(c, piece, v);
      else if (piece.kind === "drum") drum(c, piece, v, idx);
      else if (piece.kind === "pot") pot(c, piece, idx);
    }
  }
  const tall = pieces.filter(({ piece }) => isTall(piece) && (layer === "all" || ruinLayerOf(piece) === layer))
    .sort((a, b) => (a.piece.y + a.piece.h / 2) - (b.piece.y + b.piece.h / 2));
  for (const { piece, idx } of tall) {
    if (piece.kind === "wall") wall(c, piece, v, idx, ramp, glints);
    else if (piece.kind === "column") column(c, piece, v, idx, ramp, glints);
    else if (piece.kind === "pillar") pillar(c, piece, idx, ramp, glints);
    else oven(c, piece, glints);
  }
  // 9. brilho especular por último, do lado da luz
  for (const glint of glints) glint();
  c.restore();
}
