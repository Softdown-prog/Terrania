import { hash2 } from "../../world/random.ts";
import type { FormationShape } from "./outline.ts";

/** Uma peça de um agrupamento de formações: deslocamento, escala (altura e largura), inclinação, silhueta e a variação do desenho. */
export interface FormationPart {
  readonly dx: number;
  readonly scale: number;
  readonly width: number;
  readonly lean: number;
  readonly shape: FormationShape;
  readonly v: number;
}

/**
 * As peças de uma formação a partir da variação (0 a 1), tudo por `hash2` da própria variação (ADR 0053): uma peça principal, de
 * escala 0,8 a 1,4, largura 0,8 a 1,3 e inclinação para um lado, em uma de três silhuetas; metade das formações vem sozinha, as
 * outras com uma ou duas peças menores (40% a 70% da principal) ao lado, inclinadas para o outro lado. A ordem devolvida é a de
 * pintura: as menores primeiro, a principal por último. Valor inválido vale 0,5.
 */
export function formationParts(variation: number): FormationPart[] {
  const v = Math.max(0, Math.min(1, Number.isFinite(variation) ? variation : 0.5));
  const key = Math.floor(v * 100000), r = (i: number): number => hash2(key, i, 9301);
  const main: FormationPart = { dx: 0, scale: 1 + r(0) * 0.6, width: 0.85 + r(1) * 0.5, lean: (r(2) - 0.5) * 0.4, shape: Math.floor(r(3) * 3) as FormationShape, v: r(4) };
  const extras = r(5) < 0.5 ? 0 : r(5) < 0.82 ? 1 : 2;
  const parts: FormationPart[] = [main];
  for (let i = 0; i < extras; i++) {
    const side = (i + Math.floor(r(6) * 2)) % 2 ? 1 : -1;
    parts.push({ dx: side * (8 + r(10 + i) * 6), scale: main.scale * (0.4 + r(20 + i) * 0.3), width: 0.75 + r(30 + i) * 0.4,
      lean: -Math.sign(main.lean || 1) * (0.05 + r(40 + i) * 0.25), shape: Math.floor(r(50 + i) * 3) as FormationShape, v: r(60 + i) });
  }
  return parts.sort((a, b) => a.scale - b.scale);
}
