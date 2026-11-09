import type { InteriorRoom } from "../../engine/InteriorRoom.ts";
import type { Frame, ModeHost } from "./types.ts";

/**
 * Um quadro dentro de um interior (casa da vila). Devolve `true` se o quadro terminou aqui e `false`
 * se o herói saiu: então a superfície ainda roda NESTE quadro, como se nada tivesse havido.
 * Sair é decidido pelo próprio interior (`reachedExit`); quem muda o estado do jogo é `host.leaveInterior`.
 */
export function tickInterior(host: ModeHost, room: InteriorRoom, frame: Frame): boolean {
  const { dt, paused, movement } = frame;
  const { timers } = host;
  timers.accumulator = 0;
  if (!paused && dt > 0) { room.update(dt, movement); host.input.acknowledgeMovement(); }
  if (room.reachedExit) { host.leaveInterior(); return false; }
  timers.saveClock += dt;
  if (timers.saveClock > 12) { timers.saveClock = 0; host.save(); }
  host.updateHud();
  host.hud.setInterior(room.building.name);
  host.scene.renderInterior(room, host.travel.navigator.target, timers.clock);
  return true;
}
