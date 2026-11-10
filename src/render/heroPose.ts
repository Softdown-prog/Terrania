import { ATTACK_DURATION } from "../engine/combat/combat.ts";
import { WEAPONS, type WeaponId } from "../engine/character/Weapons.ts";

const smooth = (t: number): number => t * t * (3 - 2 * t);

/** Armas procedurais não devem ter a escala de um personagem inteiro. */
export const KNIGHT_SWORD_SCALE = 0.60;
export const KNIGHT_SWORD_GRIP = 8.4;

export interface SwordMountFrame {
  readonly ox: number;
  readonly oy: number;
  readonly rot: number;
  readonly scale: number;
  readonly attacking: boolean;
  readonly hand: number;
  readonly gripX: number;
  readonly gripY: number;
}

/** A mesma mão sustenta cabo, braço e rastro nas quatro orientações.
 * As coordenadas são visuais, relativas aos pés; não afetam combate ou colisões.
 */
export function swordMount(player: {
  readonly faceX: number; readonly faceY: number; readonly attackTime: number;
  readonly attackWeapon?: WeaponId;
}): SwordMountFrame {
  const attacking=player.attackTime>0;
  const hand=player.faceX<-.3?-1:1;
  const tilt=player.faceY<-.35?-.95:.95;
  const rot=attacking
    ? Math.atan2(player.faceY,player.faceX)+swordSwing(player.attackTime,player.attackWeapon).angle
    : hand<0?Math.PI-tilt:tilt;
  const gripX=hand*10.2+(attacking?player.faceX*1.2:0);
  const gripY=-14.6+(attacking?player.faceY*1.1:0);
  const reach=KNIGHT_SWORD_GRIP*KNIGHT_SWORD_SCALE;
  return {ox:gripX-Math.cos(rot)*reach,oy:gripY-Math.sin(rot)*reach,
    rot,scale:KNIGHT_SWORD_SCALE,attacking,hand,gripX,gripY};
}

/** Relative sword angle. The blade crosses the facing direction exactly when
 * Player.consumeStrike permits the hit; follow-through cannot produce damage.
 */
export function swordSwing(attackTime: number, weapon?: WeaponId): { angle: number; trail: boolean } {
  const windup = WEAPONS[weapon ?? "starter"].windup;
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
  const windup = WEAPONS[weapon ?? "starter"].windup;
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
  // Sem ataque ativo não pode haver rastro, inclusive na arma forjada,
  // cujo preparo longo alcança a janela de rastro após o fim da pose.
  if (!(attackTime > 0)) return { angles: [], alpha: 0 };
  const windup = WEAPONS[weapon ?? "starter"].windup;
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
