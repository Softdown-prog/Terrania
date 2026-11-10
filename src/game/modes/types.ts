import type { Input } from "../../input/Input.ts";
import type { Camera } from "../../render/Camera.ts";
import type { Effects } from "../../render/Effects.ts";
import type { WorldRenderer } from "../../render/WorldRenderer.ts";
import type { OfflineSimulation } from "../../engine/OfflineSimulation.ts";
import type { visibleBattleCreatures } from "../../engine/combat/ClassicBattleList.ts";
import type { CanvasScene } from "../../ui/CanvasScene.ts";
import type { GameUi } from "../../ui/GameUi.ts";
import type { TravelState } from "../TravelState.ts";

/** O que o início de cada quadro decidiu (entrada, pausa, direção) e todos os modos precisam saber. */
export interface Frame {
  readonly dt: number;
  readonly paused: boolean;
  readonly movement: { x: number; y: number };
  readonly attack: boolean;
  readonly manualActive: boolean;
  readonly tileRoute: boolean;
  readonly still: { x: number; y: number };
}

/**
 * Os quatro relógios do jogo, num só objeto passado por referência: o que um modo altera, o outro vê.
 * `accumulator` guarda o tempo ainda não simulado a 60 Hz e é zerado ao sair da superfície.
 */
export interface FrameTimers {
  clock: number;
  battleClock: number;
  saveClock: number;
  accumulator: number;
}

/**
 * Tudo que um modo de jogo (superfície, caverna, interior) pode usar do `Game`, e nada além disso.
 * É a única ligação entre os arquivos de `modes/` e o orquestrador: se um modo precisar de algo novo,
 * ele aparece aqui, à vista, em vez de o modo alcançar o `Game` inteiro.
 * `sim` e `world` são trocados a cada mundo novo; por isso são lidos sempre da `host`, nunca guardados.
 */
export interface ModeHost {
  readonly sim: OfflineSimulation;
  readonly world: WorldRenderer;
  readonly input: Input;
  readonly travel: TravelState;
  readonly hud: GameUi;
  readonly scene: CanvasScene;
  readonly camera: Camera;
  readonly effects: Effects;
  readonly timers: FrameTimers;
  save(): void;
  updateHud(): void;
  hudBattleRows(): ReturnType<typeof visibleBattleCreatures>;
  leaveCave(): void;
  leaveInterior(): void;
}
