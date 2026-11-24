import { ATTACK_DURATION } from "../../engine/combat/combat.ts";

const smooth = (t: number): number => t * t * (3 - 2 * t);
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/**
 * Em que ponto da conjuração o Mago está (ADR 0070), só apresentação. `elapsed` conta desde o início da magia; `windup` é o preparo do
 * cajado (o instante em que a magia sai, a mesma regra de `Player.consumeStrike`). Fora da conjuração tudo vale 0.
 * - `charge` 0..1: sobe no preparo (a gema acende) e desce depois da saída;
 * - `thrust` 0..1: o cajado avança no momento da saída e volta;
 * - `flash` 0..1: o clarão logo depois que a magia sai;
 * - `active`: há conjuração em andamento.
 */
export interface CastPhase { readonly charge: number; readonly thrust: number; readonly flash: number; readonly active: boolean }

export const NO_CAST: CastPhase = { charge: 0, thrust: 0, flash: 0, active: false };

export function castPhase(attackTime: number, windup: number): CastPhase {
  if (!(attackTime > 0) || !Number.isFinite(attackTime) || !(windup > 0) || !Number.isFinite(windup)) return NO_CAST;
  const elapsed = Math.max(0, Math.min(ATTACK_DURATION, ATTACK_DURATION - attackTime));
  const before = Math.min(windup, ATTACK_DURATION);
  if (elapsed <= before) return { charge: smooth(elapsed / before), thrust: 0, flash: 0, active: true };
  const p = ATTACK_DURATION > before ? (elapsed - before) / (ATTACK_DURATION - before) : 1;
  return {
    charge: clamp01(1 - p * 1.35),
    thrust: Math.sin(Math.PI * clamp01(p)) * Math.pow(1 - clamp01(p), 0.35),
    flash: clamp01(1 - p * 3.4),
    active: true,
  };
}

/**
 * O corpo na conjuração: um passo curto para trás no preparo e um balanço para a frente na saída, bem menor que o do golpe de espada
 * (o Mago não investe contra o alvo). `lunge` -1..1 e `impact` 0..1 têm o mesmo sentido de `attackBody`.
 */
export function castBody(attackTime: number, windup: number): { lunge: number; impact: number } {
  const cast = castPhase(attackTime, windup);
  if (!cast.active) return { lunge: 0, impact: 0 };
  if (cast.thrust === 0 && cast.flash === 0) return { lunge: -0.3 * Math.sin(Math.PI * cast.charge), impact: 0 };
  return { lunge: 0.4 * cast.thrust, impact: cast.flash };
}
