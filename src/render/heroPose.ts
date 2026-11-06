import { ATTACK_DURATION, ATTACK_WINDUP } from "../engine/combat.ts";

const smooth = (t: number): number => t * t * (3 - 2 * t);

/** Relative sword angle. The blade crosses the facing direction exactly when
 * Player.consumeStrike permits the hit; follow-through cannot produce damage.
 */
export function swordSwing(attackTime: number): { angle: number; trail: boolean } {
  const elapsed = Math.max(0, Math.min(ATTACK_DURATION, ATTACK_DURATION - attackTime));
  const beforeHit = elapsed <= ATTACK_WINDUP;
  const progress = beforeHit ? elapsed / ATTACK_WINDUP :
    (elapsed - ATTACK_WINDUP) / (ATTACK_DURATION - ATTACK_WINDUP);
  return {
    angle: beforeHit ? -1.25 * (1 - smooth(progress)) : 1.25 * smooth(progress),
    trail: elapsed >= ATTACK_WINDUP * 0.5 && elapsed <= ATTACK_WINDUP + 0.1,
  };
}
