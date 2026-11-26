/**
 * O herói montado (ADR 0092). Duas peças:
 * - `rideOf`: de onde o herói anda e olha tira o andar da montaria (fase da passada pela distância andada, movimento suavizado e o lado em que ela olha, que não
 *   volta a "direita" só porque o herói apertou para cima ou para baixo);
 * - `riderPose`: o que o corpo do herói faz em cima dela (sentado na sela: sobe e desce com o lombo, inclina para a frente, mãos na rédea, canela no estribo).
 * Matemática pura, sem Canvas; o desenho do herói (`renderHero`) e o da montaria (`renderMount`) leem os mesmos números, então andam juntos.
 */
import { smoothTo } from "../animation.ts";
import { smoothstep } from "../draw.ts";
import { mountBob, stepRide, type MountRide } from "../creatures/mounts/gait.ts";

/** Quantas voltas de passada da montaria por volta do ciclo de caminhada do herói a pé (o cavalo tem passada mais longa que a do herói). */
export const RIDE_PHASE_PER_WALK = .9;
const finite = (n: number | undefined): number => n !== undefined && Number.isFinite(n) ? n : 0;

const facings = new Map<string, 1 | -1>();
/** O lado para onde a montaria olha: o do olhar do herói e, de frente ou de costas, o último lado (começa à direita). */
function facingOf(id: string, faceX: number): 1 | -1 {
  const last = facings.get(id) ?? 1;
  const next = faceX > .3 ? 1 : faceX < -.3 ? -1 : last;
  facings.delete(id); facings.set(id, next);
  if (facings.size > 32) { const first = facings.keys().next().value; if (first !== undefined) facings.delete(first); }
  return next;
}
export const resetRideMemory = (): void => facings.clear();

export interface RideInput { readonly faceX: number; readonly walkTime: number; readonly vx?: number | undefined; readonly vy?: number | undefined }
/** O andar da montaria sob este herói (sem degraus: `renderMount` e `renderHero` os aplicam, cada um onde precisa). */
export function rideOf(player: RideInput, id: string, time: number | undefined): MountRide {
  const speed = Math.hypot(finite(player.vx), finite(player.vy));
  return {
    phase: finite(player.walkTime) * RIDE_PHASE_PER_WALK,
    moving: smoothTo("ride-m:" + id, smoothstep(speed / 70), time, 12),
    facing: facingOf(id, finite(player.faceX)),
  };
}

export interface RiderPose {
  /** Deslocamento vertical do corpo (negativo = sobe): o do lombo da montaria. */
  readonly bob: number;
  /** Inclinação do tronco para a frente, em radianos. */
  readonly lean: number;
  /** Quanto as mãos sobem e descem na rédea (unidades). */
  readonly hand: number;
  /** O quanto a canela do lado da tela sobe e desce no estribo (unidades). */
  readonly leg: number;
}
/** A pose do cavaleiro na passada dada (a mesma que a montaria desenha). */
export function riderPose(ride: MountRide): RiderPose {
  const r = stepRide(ride), m = r.moving;
  return {
    bob: mountBob(r),
    lean: .05 * m,
    hand: Math.sin(r.phase * 2) * .5 * m,
    leg: Math.sin(r.phase * 2) * .6 * m,
  };
}
