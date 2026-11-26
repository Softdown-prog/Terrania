/**
 * Pelagem em mechas (ADR 0093): em vez de espetos soltos no dorso, cada mecha é uma curva fina que nasce na linha do corpo, sai para fora e se inclina para trás, com
 * comprimento e cor que variam de uma para outra. Toda a variação vem de `unit(semente, i)`: o mesmo indivíduo tem sempre a mesma pelagem.
 */
import { rgba } from "../../../draw.ts";

/** Número estável em [0, 1) para (semente, posição): o "sorteio" do desenho, que não depende de relógio nem de acaso de verdade. */
export function unit(seed: number, i: number): number {
  const v = Math.sin(seed * 12.9898 + i * 78.233 + i * i * .0137) * 43758.5453;
  return v - Math.floor(v);
}

export interface FurOptions {
  readonly seed: number;
  /** Quantas mechas na linha. */
  readonly count: number;
  /** Comprimento médio da mecha e quanto ele varia (0 a 1). */
  readonly length: number; readonly variation?: number;
  /** Quanto a mecha se inclina para trás (x negativo = para a cauda, no animal que olha para +x), em unidades por unidade de comprimento. */
  readonly sweep: number;
  readonly width?: number;
  readonly dark: string; readonly light: string;
  readonly alpha?: number;
}
type Pt = readonly [number, number];

/** Mechas ao longo de uma linha do corpo (o dorso, o peito, a cauda), saindo para o lado `out` (−1 para cima na tela, +1 para baixo). */
export function furAlong(ctx: CanvasRenderingContext2D, line: ReadonlyArray<Pt>, out: 1 | -1, o: FurOptions): void {
  if (line.length < 2) return;
  let total = 0; const lens: number[] = [];
  for (let k = 1; k < line.length; k++) { const l = Math.hypot(line[k]![0] - line[k - 1]![0], line[k]![1] - line[k - 1]![1]); lens.push(l); total += l; }
  ctx.save(); ctx.lineCap = "round";
  for (let i = 0; i < o.count; i++) {
    let d = (i + .15 + unit(o.seed, i) * .7) / o.count * total, seg = 0;
    while (seg < lens.length - 1 && d > lens[seg]!) { d -= lens[seg]!; seg++; }
    const [ax, ay] = line[seg]!, [bx, by] = line[seg + 1]!, t = lens[seg]! > 0 ? d / lens[seg]! : 0;
    const px = ax + (bx - ax) * t, py = ay + (by - ay) * t;
    const tx = (bx - ax) / (lens[seg] || 1), ty = (by - ay) / (lens[seg] || 1);
    const nx = ty * out * -1, ny = tx * out;
    const L = o.length * (1 + ((unit(o.seed, i + 97) - .5) * 2) * (o.variation ?? .35));
    const ex = px + nx * L + o.sweep * L * (1 + unit(o.seed, i + 31) * .3), ey = py + ny * L;
    const cx = px + nx * L * .55 + o.sweep * L * .15, cy = py + ny * L * .55;
    ctx.strokeStyle = rgba(i % 3 === 0 ? o.light : o.dark, o.alpha ?? .8); ctx.lineWidth = (o.width ?? 1) * (.7 + unit(o.seed, i + 53) * .6);
    ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
  }
  ctx.restore();
}

export interface FlowOptions {
  readonly seed: number; readonly count: number; readonly length: number;
  /** Direção da mecha (para onde ela corre) e a curva dela. */
  readonly dx: number; readonly dy: number; readonly bend?: number;
  readonly dark: string; readonly light: string; readonly alpha?: number; readonly width?: number;
}
/** Mechas deitadas dentro de uma caixa (o lado do corpo): use depois de `clip` do contorno. Cada uma é uma curva curta na direção `dx, dy`. */
export function furFlow(ctx: CanvasRenderingContext2D, box: { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number }, o: FlowOptions): void {
  ctx.save(); ctx.lineCap = "round";
  const norm = Math.hypot(o.dx, o.dy) || 1, ux = o.dx / norm, uy = o.dy / norm;
  for (let i = 0; i < o.count; i++) {
    const x = box.x0 + (box.x1 - box.x0) * unit(o.seed, i * 2 + 1), y = box.y0 + (box.y1 - box.y0) * unit(o.seed, i * 2 + 2);
    const L = o.length * (.6 + unit(o.seed, i + 211) * .8), b = (o.bend ?? .25) * L * (unit(o.seed, i + 17) - .5) * 2;
    ctx.strokeStyle = rgba(unit(o.seed, i + 5) > .72 ? o.light : o.dark, o.alpha ?? .5); ctx.lineWidth = (o.width ?? .8) * (.7 + unit(o.seed, i + 73) * .6);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + ux * L * .5 - uy * b, y + uy * L * .5 + ux * b, x + ux * L, y + uy * L); ctx.stroke();
  }
  ctx.restore();
}
