/** Matemática pura de animação (sem Canvas): testável em Node e independente de regras do jogo. */
import { clamp01 } from "./draw.ts";

export interface GaitFoot {
  /** Deslocamento do pé ao longo da direção do movimento (px). */
  along: number;
  /** Altura do pé acima do chão (px). */
  lift: number;
}
export interface Gait {
  a: GaitFoot;
  b: GaitFoot;
  /** Deslocamento vertical do corpo (negativo = sobe). */
  bob: number;
  /** Inclinação do tronco para frente, em radianos. */
  lean: number;
  /** Balanço dos braços, -1..1, oposto às pernas. */
  armSwing: number;
  /** Amplitude 0..1 usada para suavizar parada e partida. */
  moving: number;
}

export const STRIDE = 7;
export const FOOT_LIFT = 3.6;

/**
 * Ciclo de caminhada derivado de `walkTime` (já proporcional à distância real
 * percorrida), portanto os pés acompanham o deslocamento sem patinar em excesso.
 */
export function gait(walkTime: number, moving: number): Gait {
  const m = clamp01(moving);
  const s = Math.sin(walkTime), c = Math.cos(walkTime);
  return {
    a: { along: s * STRIDE * m, lift: Math.max(0, c) * FOOT_LIFT * m },
    b: { along: -s * STRIDE * m, lift: Math.max(0, -c) * FOOT_LIFT * m },
    bob: -Math.abs(c) * 1.5 * m,
    lean: 0.07 * m,
    armSwing: s * m,
    moving: m,
  };
}

/** Fração 0..1 de pálpebra fechada; piscadas irregulares por indivíduo. */
export function blink(time: number, seed: number): number {
  const period = 3.1 + (seed % 1) * 2.4;
  const t = (((time + seed * 7.3) % period) + period) % period;
  return t < 0.14 ? Math.sin((t / 0.14) * Math.PI) : 0;
}

const smoothing = new Map<string, { v: number; t: number }>();
/**
 * Aproxima um valor ao alvo com taxa exponencial independente da taxa de quadros.
 * Sem `time` (prévias estáticas) devolve o alvo. O mapa é limitado.
 */
export function smoothTo(key: string, target: number, time: number | undefined, rate: number): number {
  if (time === undefined) return target;
  const state = smoothing.get(key);
  if (!state || time < state.t - 0.5) {
    smoothing.set(key, { v: target, t: time });
    return target;
  }
  const dt = Math.min(0.1, Math.max(0, time - state.t));
  state.v += (target - state.v) * (1 - Math.exp(-rate * dt));
  state.t = time;
  if (smoothing.size > 96) {
    const first = smoothing.keys().next().value;
    if (first !== undefined && first !== key) smoothing.delete(first);
  }
  return state.v;
}
export function resetSmoothing(): void { smoothing.clear(); }

export interface SlimePose {
  scaleX: number;
  scaleY: number;
  /** Altura do salto em px. */
  lift: number;
  /** Deslocamento lateral em direção ao alvo (já multiplicado pela direção). */
  lean: number;
}
/**
 * Squash & stretch: alonga no ar, achata ao pousar, comprime ao ser atingida e
 * estica em direção ao herói na mordida. `bounce` vem da simulação (−1..1).
 */
export function slimePose(bounce: number, hurt: number, near: number, bite: number): SlimePose {
  const b = Math.max(-1, Math.min(1, Number.isFinite(bounce) ? bounce : 0));
  const air = Math.max(0, b), land = Math.max(0, -b);
  const h = clamp01(hurt / 0.22), n = clamp01(near), k = clamp01(bite);
  return {
    scaleX: 1 - air * 0.09 + land * 0.15 + h * 0.2 + n * 0.05 + k * 0.16,
    scaleY: 1 + air * 0.16 - land * 0.13 - h * 0.24 - n * 0.07 - k * 0.12,
    lift: air * 4.4 * (1 - n * 0.4),
    lean: k * 5,
  };
}
