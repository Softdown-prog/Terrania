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

/**
 * Movimento do corpo durante o golpe, só apresentação: recua no preparo e
 * avança na varredura. Vale 0 no início, no instante de impacto e no fim, de
 * modo que o corpo nunca desloca o contato autorizado pela simulação.
 * `lunge` -1..1 (negativo = recuo), `impact` 0..1 pulsa logo após o contato.
 */
export function attackBody(attackTime: number, weapon?: WeaponId): { lunge: number; impact: number } {
  if (!(attackTime > 0)) return { lunge: 0, impact: 0 };
  const windup = WEAPONS[weapon === "forge" ? "forge" : "starter"].windup;
  const elapsed = Math.max(0, Math.min(ATTACK_DURATION, ATTACK_DURATION - attackTime));
  if (elapsed <= windup) return { lunge: -0.55 * Math.sin(Math.PI * (elapsed / windup)), impact: 0 };
  const p = (elapsed - windup) / (ATTACK_DURATION - windup);
  return {
    lunge: Math.sin(Math.PI * p) * Math.pow(1 - p, 0.35),
    impact: Math.max(0, 1 - p * 3.2),
  };
}

/** Ângulos relativos recentes da lâmina, do mais antigo ao atual, para o rastro. */
export function swingTrail(attackTime: number, weapon?: WeaponId): { angles: number[]; alpha: number } {
  const windup = WEAPONS[weapon === "forge" ? "forge" : "starter"].windup;
  const elapsed = Math.max(0, Math.min(ATTACK_DURATION, ATTACK_DURATION - attackTime));
  const visible = elapsed >= windup * 0.45 && elapsed <= windup + 0.16;
  if (!visible) return { angles: [], alpha: 0 };
  const angles: number[] = [];
  for (let k = 6; k >= 0; k--) {
    const back = Math.min(ATTACK_DURATION, attackTime + k * 0.014);
    angles.push(swordSwing(back, weapon).angle);
  }
  const fadeIn = Math.min(1, (elapsed - windup * 0.45) / (windup * 0.35 || 0.05));
  const fadeOut = elapsed <= windup ? 1 : Math.max(0, 1 - (elapsed - windup) / 0.16);
  return { angles, alpha: Math.max(0, Math.min(1, fadeIn)) * fadeOut };
}
