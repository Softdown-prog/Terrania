import { ATTACK_DURATION } from "../engine/combat.ts";
import { WEAPONS, type WeaponId } from "../engine/Weapons.ts";

const smooth = (t: number): number => t * t * (3 - 2 * t);

/** Relative sword angle. The blade crosses the facing direction exactly when
 * Player.consumeStrike permits the hit; follow-through cannot produce damage.
 */
export function swordSwing(attackTime: number, weapon?: WeaponId): { angle: number; trail: boolean } {
  const windup = WEAPONS[weapon === "forge" ? "forge" : "starter"].windup;
  const elapsed = Math.max(0, Math.min(ATTACK_DURATION, ATTACK_DURATION - attackTime));
  const beforeHit = elapsed <= windup;
  const progress = beforeHit ? elapsed / windup : (elapsed - windup) / (ATTACK_DURATION - windup);
  return {
    angle: beforeHit ? -1.25 * (1 - smooth(progress)) : 1.25 * smooth(progress),
    trail: elapsed >= windup * 0.5 && elapsed <= windup + 0.1,
  };
}
