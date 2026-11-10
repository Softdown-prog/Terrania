import { applyCaveVictories } from "../../engine/rooms/CaveRewards.ts";
import type { CaveRoom } from "../../engine/rooms/CaveRoom.ts";
import { TILE_SIZE } from "../../world/terrain.ts";
import type { Frame, ModeHost } from "./types.ts";

/** Um quadro na caverna: `true` = terminou aqui; `false` = o herói saiu (escada ou queda) e a superfície ainda roda NESTE quadro. */
export function tickCave(host: ModeHost, cave: CaveRoom, frame: Frame): boolean {
  const { dt, paused, movement, attack, manualActive } = frame;
  const { timers } = host;
  timers.accumulator=0;
  if (!paused && dt > 0) {
    const focused = host.travel.combat.targetId;
    const classicStrike = host.travel.combat.tick(dt,cave.player,cave.monsters,
      cave.collision,host.sim.inventory.weapon.interval,host.sim.inventory.loadout.equipped);
    const follow = host.travel.autoFollow && !manualActive && host.travel.navigator.target === null;
    const caveMovement = follow
      ? host.travel.pursuit.direction(dt,cave.player,focused,cave.monsters,cave.collision)
      : movement;
    cave.update(dt,caveMovement,attack || classicStrike,
      host.sim.inventory.loadout.equipped,host.sim.inventory.defense,
      classicStrike ? host.travel.combat.strikeTargetId : undefined);
    host.input.acknowledgeMovement();
    const changed = applyCaveVictories(host.sim, cave);
    if(changed)host.save();
  }
  if(cave.player.hp<=0){
    host.leaveCave();
    host.sim.player.hp=0;
    host.save();
    host.hud.setTravelNotice("Você tombou na caverna. Renasça para continuar.");
  } else if(cave.reachedExit){
    host.leaveCave();
  } else {
    timers.saveClock += dt;
    if(timers.saveClock>12){timers.saveClock=0;host.save();}
    host.updateHud();
    host.hud.setCave({floor:cave.floor,
      tileX:Math.floor(cave.player.x/TILE_SIZE),tileY:Math.floor(cave.player.y/TILE_SIZE)});
    host.hud.setNearbyAction(cave.nearExit?"leave":null);
    if(timers.battleClock>=0.2){
      timers.battleClock=0;
      host.hud.setBattleCreatures(host.hudBattleRows(),host.travel.combat.targetId);
      host.hud.setCombatTarget(host.travel.combat.label(cave.monsters));
    }
    host.scene.renderCave(cave,host.camera.zoom,timers.clock,host.travel.navigator.target,
      host.sim.inventory.gear,host.sim.inventory.loadout.equipped);
    return true;
  }
  return false;
}
