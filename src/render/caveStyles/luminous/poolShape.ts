import { hash2 } from "../../../world/random.ts";

/** Quantos pontos tem o contorno de uma poça. */
export const POOL_POINTS = 9;

/** Os números que fazem cada poça diferente da outra: tamanho, achatamento, giro e o raio de cada ponto do contorno. */
export interface PoolParams {
  readonly size: number;
  readonly aspect: number;
  readonly rotation: number;
  readonly radii: readonly number[];
}

/**
 * Forma de uma poça a partir da variação (0 a 1): tudo sai de `hash2` da própria variação, então a mesma variação
 * dá sempre a mesma poça e variações diferentes dão tamanhos de 0,7 a 1,6, formas mais redondas ou compridas e contornos
 * que não se repetem. Valor inválido vale 0,5.
 */
export function poolParams(variation: number): PoolParams {
  const v = Math.max(0, Math.min(1, Number.isFinite(variation) ? variation : 0.5));
  const key = Math.floor(v * 100000), r = (i: number): number => hash2(key, i, 9101);
  return {
    size: 0.7 + r(0) * 0.9,
    aspect: 0.75 + r(1) * 0.55,
    rotation: (r(2) - 0.5) * 0.8,
    radii: Array.from({ length: POOL_POINTS }, (_, i) => 0.76 + r(10 + i) * 0.46),
  };
}

/** Contorno suave e fechado da poça (raio-base de 12 px, achatado em 0,55 pela perspectiva do chão); pontos médios dão as curvas. */
export function blobPath(params: PoolParams, c: CanvasRenderingContext2D, grow = 1): void {
  const pts = params.radii.map((radius, i) => {
    const a = (i / POOL_POINTS) * Math.PI * 2 + params.rotation;
    return [Math.cos(a) * 12 * radius * grow, Math.sin(a) * 12 * radius * grow * 0.55 * params.aspect] as const;
  });
  const mid = (i: number): readonly [number, number] => {
    const a = pts[i % POOL_POINTS]!, b = pts[(i + 1) % POOL_POINTS]!;
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  };
  const start = mid(POOL_POINTS - 1);
  c.beginPath();
  c.moveTo(start[0], start[1]);
  for (let i = 0; i < POOL_POINTS; i++) {
    const to = mid(i), via = pts[i]!;
    c.quadraticCurveTo(via[0], via[1], to[0], to[1]);
  }
  c.closePath();
}
