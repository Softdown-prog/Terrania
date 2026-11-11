import { hash2 } from "../../world/random.ts";
import { ellipse, mix, rgba, shade, softShadow } from "../draw.ts";
import { ROCK_VARIANTS } from "./types.ts";

const OUTLINE = "#2b1a0e";
const GLINT = "#fff6dc";
/** Faixas de estrato, de baixo para cima: o arenito alterna camadas claras e escuras. */
const STRATA = ["#a97b48", "#d2a66b", "#be8f55", "#e3be86", "#c99a5f"] as const;

type Point = readonly [number, number];

/** Contornos do pé até o topo, com a base em y = 0 (cinco formas simples; a sexta é um grupo de pedras pequenas). */
const SILHOUETTES: ReadonlyArray<readonly Point[]> = [
  [[-15, 0], [-17, -9], [-10, -19], [2, -22], [13, -17], [17, -8], [14, 0]], // matacão arredondado
  [[-20, 0], [-21, -6], [-12, -11], [6, -12], [18, -9], [21, -3], [19, 0]], // laje baixa e larga
  [[-9, 0], [-10, -12], [-8, -24], [-2, -30], [5, -27], [9, -16], [11, 0]], // pilar esculpido pelo vento
  [[-16, 0], [-17, -9], [-12, -13], [-9, -14], [-8, -22], [0, -25], [8, -21], [9, -14], [15, -11], [17, -4], [15, 0]], // dois blocos
  [[-17, 0], [-18, -10], [-9, -20], [3, -23], [14, -17], [18, -7], [16, 0], [9, 0], [8, -6], [1, -9], [-6, -6], [-8, 0]], // arco baixo no pé
];

/** Caminho suave pelos pontos (curvas entre os pontos médios), fechado, com um pequeno desvio por formato. */
function body(c: CanvasRenderingContext2D, pts: readonly Point[], shape: number): void {
  const p = pts.map(([x, y], i): Point => [x + (hash2(i, shape, 91) - 0.5) * 1.8, y === 0 ? 0 : y + (hash2(i, shape, 93) - 0.5) * 1.8]);
  const mid = (a: Point, b: Point): Point => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  c.beginPath();
  const start = mid(p[p.length - 1]!, p[0]!);
  c.moveTo(start[0], start[1]);
  for (let i = 0; i < p.length; i++) {
    const m = mid(p[i]!, p[(i + 1) % p.length]!);
    c.quadraticCurveTo(p[i]![0], p[i]![1], m[0], m[1]);
  }
  c.closePath();
}

/** Uma pedra inteira de arenito, com `ox`/`oy`/`scale` para poder compor grupos. */
function stone(c: CanvasRenderingContext2D, shape: number, ox: number, oy: number, scale: number): void {
  const pts = SILHOUETTES[shape % SILHOUETTES.length]!;
  const h = (i: number): number => hash2(i, shape, 97);
  c.save();
  c.translate(ox, oy);
  c.scale(scale, scale);
  // 1. Sombra no chão para sudeste e areia amontoada no pé, mais clara que o chão.
  softShadow(c, 4, 1.5, 24, 6, 0.38);
  ellipse(c, -2, 0.6, 21, 4.2, rgba("#e9d6a4", 0.55));
  ellipse(c, 6, 1.4, 14, 2.6, rgba("#c9a468", 0.4));
  // 2. Corpo com luz de noroeste: claro no alto e à esquerda, escuro embaixo e à direita.
  const lit = c.createLinearGradient(-18, -28, 16, 2);
  lit.addColorStop(0, "#ecd09b");
  lit.addColorStop(0.5, "#c9965a");
  lit.addColorStop(1, "#8a5d36");
  body(c, pts, shape);
  c.fillStyle = lit;
  c.fill();
  // 3. Estratos: faixas curvas e levemente inclinadas, recortadas pela silhueta.
  c.save();
  body(c, pts, shape);
  c.clip();
  const tilt = (h(1) - 0.5) * 3;
  STRATA.forEach((color, k) => {
    const top = -3 - k * 5.6 + (h(2 + k) - 0.5) * 1.4;
    c.fillStyle = rgba(color, 0.5);
    c.beginPath();
    c.moveTo(-26, top + tilt);
    c.quadraticCurveTo(0, top - 2.2 - h(8 + k) * 1.4, 26, top - tilt);
    c.lineTo(26, top - tilt + 3.4 + (k % 2) * 1.4);
    c.quadraticCurveTo(0, top - 2.2 + 3.4 + (k % 2) * 1.4, -26, top + tilt + 3.4 + (k % 2) * 1.4);
    c.closePath();
    c.fill();
    // Fio escuro sob a camada, onde o vento escavou a junta.
    c.strokeStyle = rgba(shade(color, -0.45), 0.5);
    c.lineWidth = 0.7;
    c.beginPath();
    c.moveTo(-26, top + tilt + 3.4 + (k % 2) * 1.4);
    c.quadraticCurveTo(0, top - 2.2 + 3.4 + (k % 2) * 1.4, 26, top - tilt + 3.4 + (k % 2) * 1.4);
    c.stroke();
  });
  // 4. Lado da sombra (direito e de baixo) e nichos de erosão com o fundo escuro.
  const side = c.createLinearGradient(-4, -16, 20, -2);
  side.addColorStop(0, rgba("#5a3a22", 0));
  side.addColorStop(1, rgba("#5a3a22", 0.55));
  c.fillStyle = side;
  c.fillRect(-26, -34, 52, 36);
  for (let i = 0; i < 3; i++) {
    const nx = -9 + h(20 + i) * 18, ny = -5 - h(23 + i) * 12, w = 2.2 + h(26 + i) * 2.6;
    ellipse(c, nx, ny, w, w * 0.55, rgba("#5f3c22", 0.5));
    ellipse(c, nx - 0.4, ny + w * 0.45, w * 0.9, w * 0.2, rgba("#f0d6a2", 0.5));
  }
  // Fendas, também recortadas pela silhueta.
  c.strokeStyle = rgba(OUTLINE, 0.6);
  c.lineWidth = 0.8;
  c.beginPath();
  c.moveTo(-2 + h(30) * 5, -19 - h(31) * 3);
  c.quadraticCurveTo(-4 + h(32) * 4, -12, -1 + h(33) * 3, -5);
  c.moveTo(7 + h(34) * 3, -14);
  c.quadraticCurveTo(5, -10, 7, -6);
  c.stroke();
  c.restore();
  // 5. Contorno (as fendas já foram desenhadas dentro do recorte, para nunca passarem da silhueta).
  body(c, pts, shape);
  c.strokeStyle = rgba(OUTLINE, 0.72);
  c.lineWidth = 1.05;
  c.stroke();
  // 6. Reflexo no alto à esquerda e uma lasca clara; grãos de areia em volta do pé.
  c.strokeStyle = rgba(GLINT, 0.7);
  c.lineWidth = 1.1;
  c.beginPath();
  c.moveTo(pts[1]![0] + 2, pts[1]![1] - 0.4);
  c.quadraticCurveTo(pts[2]![0] + 1, pts[2]![1] + 0.2, pts[3]![0] - 2, pts[3]![1] + 0.8);
  c.stroke();
  ellipse(c, pts[1]![0] + 4, pts[1]![1] + 3, 1.7, 0.8, rgba(GLINT, 0.6));
  for (let i = 0; i < 6; i++)
    ellipse(c, -20 + h(40 + i) * 40, 1.2 + h(46 + i) * 2, 0.9, 0.55, i % 2 ? rgba("#f2e1b4", 0.8) : rgba(mix("#b88e56", OUTLINE, 0.3), 0.6));
  c.restore();
}

/**
 * Pedra de arenito do deserto (ADR 0035): estratos em faixas de tons de areia, juntas escavadas pelo vento,
 * nichos de erosão, lado de sombra, areia amontoada no pé, contorno e reflexo, sem nenhum musgo. `variant` (0 a 5)
 * escolhe o formato: matacão, laje, pilar, dois blocos, arco baixo ou um grupo de pedras pequenas.
 */
export function drawSandstoneRock(c: CanvasRenderingContext2D, variant: number): void {
  const v = Math.max(0, Math.min(ROCK_VARIANTS - 1, Math.floor(Number.isFinite(variant) ? variant : 0)));
  if (v < 5) { stone(c, v, 0, 0, 1); return; }
  stone(c, 0, -11, -1, 0.74);
  stone(c, 1, 11, 1, 0.6);
  stone(c, 4, -1, 2.5, 0.48);
}
