/** Primitivas de desenho procedural compartilhadas. Sem imagens nem DOM no import. */
export const TAU = Math.PI * 2;

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const smoothstep = (t: number): number => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};
export const easeOutBack = (t: number): number => {
  const x = clamp01(t) - 1;
  return 1 + 2.2 * x * x * x + 1.2 * x * x;
};

export function ellipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string | CanvasGradient,
  rotation = 0,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rotation, 0, TAU);
  ctx.fill();
}

function parse(hex: string): [number, number, number] {
  const h = hex.charAt(0) === "#" ? hex.slice(1) : hex;
  return [
    parseInt(h.slice(0, 2), 16) || 0,
    parseInt(h.slice(2, 4), 16) || 0,
    parseInt(h.slice(4, 6), 16) || 0,
  ];
}
const hex2 = (n: number): string => {
  const v = Math.max(0, Math.min(255, Math.round(n)));
  return (v < 16 ? "0" : "") + v.toString(16);
};

const mixCache = new Map<string, string>();
/** Mistura duas cores #rrggbb; t em [0,1]. Resultado memorizado (t quantizado). */
export function mix(a: string, b: string, t: number): string {
  const q = Math.round(clamp01(t) * 32);
  const key = a + b + q;
  const hit = mixCache.get(key);
  if (hit) return hit;
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const k = q / 32;
  const out = "#" + hex2(lerp(ar, br, k)) + hex2(lerp(ag, bg, k)) + hex2(lerp(ab, bb, k));
  if (mixCache.size > 4000) mixCache.clear();
  mixCache.set(key, out);
  return out;
}
/** amount>0 clareia, amount<0 escurece. */
export function shade(hex: string, amount: number): string {
  return amount >= 0 ? mix(hex, "#fff6dc", amount) : mix(hex, "#0b1d22", -amount);
}
/** Cor #rrggbb com alfa 0..1 em formato rgba(). */
export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = parse(hex);
  return "rgba(" + r + "," + g + "," + b + "," + Math.round(clamp01(alpha) * 1000) / 1000 + ")";
}

/** Hash estável 0..1 para textos (ids de criaturas). */
export function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

/** Sombra macia no chão (gradiente radial); alfa já embutido. */
export function softShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  alpha = 0.34,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, rx * 0.1, 0, 0, rx);
  g.addColorStop(0, "rgba(10,28,26," + alpha + ")");
  g.addColorStop(0.65, "rgba(10,28,26," + alpha * 0.55 + ")");
  g.addColorStop(1, "rgba(10,28,26,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** Caminho de cápsula (sem depender de `roundRect`, ausente em navegadores antigos). */
export function pill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const r = Math.min(h / 2, Math.max(0, w) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(x + r, y + h);
  ctx.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5);
  ctx.closePath();
}

/** Segmento arredondado, usado para membros (pernas, braços, caules). */
export function limb(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  color: string,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.lineCap = "butt";
}

/** Curva leve para folha/erva, compartilhada por várias camadas de terreno. */
export const blade = (ctx: CanvasRenderingContext2D, x: number, y: number, h: number, lean: number, color: string): void => {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * 0.3, y - h * 0.6, x + lean, y - h);
  ctx.stroke();
};
