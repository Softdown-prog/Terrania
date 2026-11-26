/**
 * Corpo de quatro patas montado a partir do tronco e das pernas articuladas (ADR 0091): pernas do lado distante, tronco, pernas do lado próximo, e a passada em
 * diagonais (a anterior próxima anda junto com a posterior distante). A espécie dá só as medidas; a cabeça, o pescoço, o rabo e os enfeites ficam no arquivo dela.
 */
import type { KitPalette } from "./palette.ts";
import { drawLeg, legPose, type FootKind, type LegSpec } from "./limbs.ts";
import { drawTorso, type TorsoSpec } from "./torso.ts";
import { mountBob, type MountGaitState } from "./gait.ts";

export interface LimbShape {
  readonly upper: number; readonly lower: number;
  readonly widthTop: number; readonly widthKnee: number; readonly widthAnkle: number;
  readonly foot: FootKind;
}
export interface QuadrupedSpec {
  readonly torso: TorsoSpec;
  readonly frontLeg: LimbShape; readonly rearLeg: LimbShape;
  /** Onde os membros nascem: x do anterior e do posterior, e a altura do quadril (negativa). */
  readonly frontHipX: number; readonly rearHipX: number; readonly hipY: number;
  /** A passada: quanto a pata balança e quanto sobe. */
  readonly stride: number; readonly lift: number;
}

/** A passada anda com o tempo (cinco radianos por segundo, o ritmo que as montarias sempre tiveram), mesmo parado, como um animal que se mexe no lugar. */
export const GAIT_RATE = 5;

/** As quatro pernas de uma espécie na fase dada: anterior e posterior, próxima e distante, em diagonais. */
export function quadrupedLegs(s: QuadrupedSpec, phase: number, moving = 1): ReadonlyArray<{ readonly spec: LegSpec; readonly phase: number }> {
  const make = (front: boolean, far: boolean, offset: number): { spec: LegSpec; phase: number } => {
    const shape = front ? s.frontLeg : s.rearLeg;
    return { spec: { hipX: (front ? s.frontHipX : s.rearHipX) + (far ? -1.5 : 0), hipY: s.hipY, ...shape, front, far, stride: s.stride * moving, lift: s.lift * moving }, phase: phase + offset };
  };
  return [make(true, true, Math.PI), make(false, false, Math.PI), make(true, false, 0), make(false, true, 0)].sort((a, b) => Number(b.spec.far) - Number(a.spec.far));
}

/**
 * O corpo inteiro: pernas distantes, o que fica atrás do tronco (pescoço e cabeça, que nascem dentro dele), tronco, pernas próximas. Com `gait` (montaria montada,
 * ADR 0092) a passada vem da fase dada, as patas balançam só o quanto ela anda e o tronco sobe e desce; sem ele, anda com o relógio como sempre.
 */
export function drawQuadruped(ctx: CanvasRenderingContext2D, p: KitPalette, s: QuadrupedSpec, time: number, behind?: () => void, gait?: MountGaitState): void {
  const legs = quadrupedLegs(s, gait ? gait.phase : time * GAIT_RATE, gait ? gait.moving : 1);
  for (const leg of legs) if (leg.spec.far) drawLeg(ctx, p, leg.spec, legPose(leg.spec, leg.phase));
  ctx.save();
  if (gait) ctx.translate(0, mountBob(gait));
  behind?.();
  drawTorso(ctx, p, s.torso);
  ctx.restore();
  for (const leg of legs) if (!leg.spec.far) drawLeg(ctx, p, leg.spec, legPose(leg.spec, leg.phase));
}
