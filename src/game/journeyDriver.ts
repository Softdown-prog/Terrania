import type { CollisionMap } from "../world/collision.ts";
import { Journey, type FindPath, type SnapPoint } from "../engine/movement/Journey.ts";
import { TapNavigator, type Point } from "../engine/movement/TapNavigator.ts";

/**
 * Um quadro da viagem de longa distância (ADR 0099), separado do `Game` para poder ser testado sem tela: se há viagem e o herói não está num trecho, pede o próximo trecho
 * e entrega ao navegador; interrompe a viagem se o herói levou dano ou há criatura por perto. Devolve o que aconteceu, para o jogo avisar o jogador.
 */
export type JourneyEvent = "arrived" | "stuck" | "danger" | null;

export interface JourneyFrame {
  readonly journey: Journey;
  readonly navigator: TapNavigator;
  readonly collision: CollisionMap;
  /** De onde sai o próximo trecho: o passo já comprometido do andar por tiles, ou a posição do herói. */
  readonly from: Point;
  /** O andar da superfície é por tiles: os trechos vão a centros de tile. */
  readonly tileSteps: boolean;
  readonly snap: SnapPoint;
  /** O herói perdeu vida desde o quadro anterior. */
  readonly hurt: boolean;
  /** Há criatura viva perto o bastante para atacar. */
  readonly threatened: boolean;
}

export function driveJourney(frame: JourneyFrame): JourneyEvent {
  const { journey, navigator, collision, from, tileSteps, snap } = frame;
  if (!journey.active) return null;
  if (frame.hurt || frame.threatened) { journey.cancel(); navigator.cancel(); return "danger"; }
  if (navigator.target !== null) return null; // ainda andando o trecho de agora
  // A busca de trechos usa o mesmo navegador do jogo, para só escolher trechos que ele consegue andar (por tiles, na superfície).
  const find: FindPath = (a, b, world) => new TapNavigator().go(a, b, world, tileSteps) ? [b] : null;
  const plan = journey.plan(from, collision, find, snap);
  if (plan.kind === "arrived") return "arrived";
  if (plan.kind === "stuck") return "stuck";
  if (!navigator.go(from, plan.to, collision, tileSteps)) { journey.cancel(); return "stuck"; }
  return null;
}
