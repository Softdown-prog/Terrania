import { valueNoise } from "../../../../world/random.ts";

/** Pergunta se o tile local (lx, ly) de um chunk é água do lago negro; vale de -2 a CHUNK_TILES + 1. */
export type LakeAt = (lx: number, ly: number) => boolean;

/** Quanto a borda pode se afastar da borda do tile (em fração de tile): cerca de 10 px, para a costa seguir a colisão. */
export const COAST_WOBBLE = 0.3;

/**
 * Cobertura de água (0 a 1) num ponto do chunk, em tiles locais (tx, ty) com fração: interpola entre os centros dos
 * tiles, então a costa (cobertura 0,5) passa pela borda entre um tile de água e um de terra, onde fica a colisão.
 * Sem a ondulação, é o valor "limpo", que também serve de portão para a lama (nunca longe do lago).
 */
export function lakeCoverage(lakeAt: LakeAt, tx: number, ty: number): number {
  const u = tx - 0.5, v = ty - 0.5;
  const i = Math.floor(u), j = Math.floor(v), fx = u - i, fy = v - j;
  const m = (x: number, y: number): number => lakeAt(x, y) ? 1 : 0;
  return (m(i, j) * (1 - fx) + m(i + 1, j) * fx) * (1 - fy) + (m(i, j + 1) * (1 - fx) + m(i + 1, j + 1) * fx) * fy;
}

/**
 * A mesma cobertura com a costa ondulada por ruído global (em tiles do mundo, gx e gy), para a margem não ser
 * uma linha reta nem uma escada. A ondulação é limitada por `COAST_WOBBLE`, então longe do lago o valor nunca
 * chega a 0,5 e dentro dele nunca cai abaixo.
 */
export function wobbledCoverage(clean: number, gx: number, gy: number, seed: number): number {
  const wobble = (valueNoise(gx / 2.2, gy / 2.2, seed + 811) - 0.5) * COAST_WOBBLE * 2 +
    (valueNoise(gx / 0.7, gy / 0.7, seed + 813) - 0.5) * COAST_WOBBLE * 0.6;
  return clean + wobble;
}
