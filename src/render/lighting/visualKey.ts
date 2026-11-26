/**
 * Degraus do estado visual de uma criatura, para a luz comum poder guardar e reaproveitar quadros (ADR 0090): o tempo vira 10 quadros por segundo, a fase da passada
 * vira oito posições por volta (como um ciclo de caminhada de sprite pré-renderizado) e o resto vira décimos. O desenho usa os valores já arredondados, então o mesmo degrau dá sempre o mesmo quadro, e a chave do cache
 * sai desses mesmos números. Nada aqui decide acerto, dano ou saque.
 */
export const FRAMES_PER_SECOND = 10;
export const PHASE_STEPS = 8;
const TAU = Math.PI * 2;

export interface VisualState {
  readonly kind: string;
  readonly hp: number;
  readonly id?: string;
  readonly hurtTime?: number;
  readonly casting?: number;
  readonly motionPhase?: number;
  readonly moving?: number;
}

const finite = (value: number | undefined): number => typeof value === "number" && Number.isFinite(value) ? value : 0;
const tenths = (value: number | undefined): number => Math.round(Math.max(0, finite(value)) * 10) / 10;

/** O tempo no degrau de 1/10 s (sempre para baixo: o quadro só muda quando o degrau muda). */
export const stepTime = (time: number): number => Math.floor(finite(time) * FRAMES_PER_SECOND) / FRAMES_PER_SECOND;

/** A mesma criatura com o estado nos degraus (campos além do estado visual passam como estão). */
export function stepVisual<T extends VisualState>(actor: T): T {
  return { ...actor, motionPhase: Math.round(finite(actor.motionPhase) / TAU * PHASE_STEPS) / PHASE_STEPS * TAU, moving: tenths(actor.moving), casting: tenths(actor.casting),
    hurtTime: Math.ceil(Math.max(0, finite(actor.hurtTime)) * 20) / 20 };
}

/** O grupo de quadros de uma criatura (espécie e indivíduo): o que não muda de um quadro para o outro. */
export const visualGroup = (actor: VisualState): string => `${actor.kind}|${actor.id ?? ""}`;

/** A chave do quadro: tudo o que muda o desenho, em números curtos e estáveis. */
export function visualKey(actor: VisualState, time: number): string {
  const phase = Math.round(finite(actor.motionPhase) / TAU * PHASE_STEPS * 1000) / 1000;
  return [actor.kind, actor.id ?? "", Math.round(finite(time) * FRAMES_PER_SECOND), phase, tenths(actor.moving), tenths(actor.casting), Math.round(finite(actor.hurtTime) * 20), Math.round(finite(actor.hp))].join("|");
}
