import { ATTACK_DURATION } from "../engine/combat/combat.ts";
import { WEAPONS, type WeaponId } from "../engine/character/Weapons.ts";
import { NO_CAST, type CastPhase } from "./spells/castPose.ts";
import { STAFF_GEM_REACH } from "./staves/shaft.ts";

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

/** Onde o cajado do Mago fica na mão (ADR 0068): a origem do cajado, o quanto ele pende para fora e qual mão o segura. */
export interface StaffMountFrame {
  readonly ox: number;
  readonly oy: number;
  readonly rot: number;
  readonly hand: number;
  readonly gripX: number;
  readonly gripY: number;
}
/** O Mago segura o cajado em pé, ao lado do corpo, pendendo um pouco para fora e oscilando com o passo; a mão é a mesma da espada. */
export const STAFF_LEAN = 0.22;
/** Na conjuração (ADR 0070) a mão recua e sobe no preparo e o cajado avança para o alvo na saída; fora dela, é a pose parada. */
export function staffMount(player: { readonly faceX: number; readonly faceY?: number }, sway = 0, cast: CastPhase = NO_CAST): StaffMountFrame {
  const hand = player.faceX < -.3 ? -1 : 1;
  const aim = player.faceX > .3 ? 1 : player.faceX < -.3 ? -1 : 0;
  const faceY = player.faceY ?? 0;
  const gripX = hand * 10.2 + (player.faceX * 2.4 - aim * 1.2 * cast.charge) * cast.thrust - aim * 1.6 * cast.charge;
  const gripY = -14.6 - 2.4 * cast.charge + faceY * 1.8 * cast.thrust;
  const rot = hand * STAFF_LEAN + sway - aim * 0.38 * cast.charge + aim * 1.05 * cast.thrust;
  return { ox: gripX, oy: gripY, rot, hand, gripX, gripY };
}
/** Onde o arco do Arqueiro fica (ADR 0116): a empunhadura, a rotação, o lado da barriga, o quanto a corda está puxada e onde a mão que puxa a corda fica. */
export interface BowMountFrame {
  readonly ox: number;
  readonly oy: number;
  readonly rot: number;
  readonly hand: number;
  readonly gripX: number;
  readonly gripY: number;
  /** Para que lado a barriga do arco aponta (para onde o herói mira; de frente ou de costas, para o lado da mão que o segura). */
  readonly belly: 1 | -1;
  /** 0 a 1: o quanto a corda está puxada (sobe no preparo do tiro e solta na saída). */
  readonly draw: number;
  /** 0 a 1: o quanto o braço do arco está erguido e esticado (0 é o arco carregado ao lado do corpo). */
  readonly raise: number;
  readonly pullX: number;
  readonly pullY: number;
}
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
/**
 * O Arqueiro leva o arco ao lado do corpo, quase em pé; no tiro (mesmas fases da conjuração, `castPhase`) o braço do arco ergue e estica para o alvo na altura do
 * ombro e a outra mão puxa a corda até perto do queixo; na saída a corda solta. A mão que segura o arco é a mesma da espada.
 */
export function bowMount(player: { readonly faceX: number; readonly faceY?: number }, sway = 0, cast: CastPhase = NO_CAST): BowMountFrame {
  const hand = player.faceX < -.3 ? -1 : 1;
  const aim = player.faceX > .3 ? 1 : player.faceX < -.3 ? -1 : 0;
  const belly = (aim !== 0 ? aim : hand) as 1 | -1;
  const raise = cast.active ? Math.min(1, cast.charge * 1.6 + cast.thrust * 1.2) : 0, draw = cast.active ? cast.charge : 0;
  const aimX = aim !== 0 ? aim * 8.6 : hand * 6.6, aimY = aim !== 0 ? -19.4 : -18.2;
  const gripX = lerp(hand * 10, aimX, raise), gripY = lerp(-14, aimY, raise);
  const rot = lerp(hand * 0.14 + sway, 0, raise);
  const pullX = gripX + belly * (-2.6 - 7.5 * draw), pullY = gripY;
  return { ox: gripX, oy: gripY, rot, hand, gripX, gripY, belly, draw, raise, pullX, pullY };
}
/** O ponto da gema do cajado no referencial dos pés do herói: de onde a magia sai. */
export function staffTip(mount: StaffMountFrame): { x: number; y: number } {
  const reach = STAFF_GEM_REACH;
  return { x: mount.ox + Math.sin(mount.rot) * reach, y: mount.oy - Math.cos(mount.rot) * reach };
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
