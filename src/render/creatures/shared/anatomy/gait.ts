/**
 * O andar de uma montaria quando alguém a monta (ADR 0092): a fase da passada vem da distância que o herói andou (não do relógio), `moving` vai de 0 (parada,
 * respirando) a 1 (andando) e `facing` diz para que lado ela olha. Entra em degraus para o quadro pronto voltar do cache (ADR 0090).
 */
export interface MountRide {
  /** Fase da passada em radianos. */
  readonly phase: number;
  /** 0 (parada) a 1 (andando). */
  readonly moving: number;
  /** +1: olha para a direita; −1: para a esquerda. */
  readonly facing: 1 | -1;
}
export type MountGaitState = Pick<MountRide, "phase" | "moving">;

/** Posições da passada por volta no quadro pronto (12: cada diagonal pisa e levanta em três quadros). */
export const RIDE_PHASE_STEPS = 12;
const TAU = Math.PI * 2;
const finite = (n: number): number => Number.isFinite(n) ? n : 0;

/** A montaria nos degraus: fase em 12 posições por volta (de 0 a menos que uma volta) e movimento em décimos. */
export function stepRide(ride: MountRide): MountRide {
  const turns = finite(ride.phase) / TAU, steps = Math.round((turns - Math.floor(turns)) * RIDE_PHASE_STEPS) % RIDE_PHASE_STEPS;
  return { phase: steps / RIDE_PHASE_STEPS * TAU, moving: Math.round(Math.min(1, Math.max(0, finite(ride.moving))) * 10) / 10, facing: ride.facing < 0 ? -1 : 1 };
}

/** A passada andando e, parada, a pose de repouso (a pata sem balanço nem altura). */
export const IDLE_GAIT: MountGaitState = { phase: 0, moving: 0 };

/** O quanto o lombo sobe e desce: o corpo fica mais alto no meio do apoio (as diagonais pisando) e mais baixo na troca. Pouco: uma unidade. */
export const BOB = 1.1;
export const mountBob = (gait: MountGaitState): number => -Math.abs(Math.sin(finite(gait.phase))) * BOB * Math.min(1, Math.max(0, finite(gait.moving)));

/** Quadros por segundo dos movimentos de enfeite (cauda, juba) da montaria montada: mais lentos que a passada, para o mesmo quadro voltar do cache. */
export const RIDE_AMBIENT_FPS = 6;
