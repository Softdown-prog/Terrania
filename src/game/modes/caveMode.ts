import { applyCaveVictories } from "../../engine/rooms/CaveRewards.ts";
import type { CaveRoom } from "../../engine/rooms/CaveRoom.ts";
import { nearbyStairsMove, reachedStairsMove } from "../../engine/rooms/caveStairs.ts";
import { TILE_SIZE } from "../../world/terrain.ts";
import { NO_MANA_MESSAGE } from "../messages/noMana.ts";
import type { Frame, ModeHost } from "./types.ts";

/** Um quadro na caverna: `true` = terminou aqui; `false` = o herói saiu (escada ou queda) e a superfície ainda roda NESTE quadro. */
export function tickCave(host: ModeHost, cave: CaveRoom, frame: Frame): boolean {
  const { dt, paused, movement, attack, manualActive } = frame;
  const { timers } = host;
  timers.accumulator=0;
  if (!paused && dt > 0) {
    const focused = host.travel.combat.targetId;
    const profile = host.sim.combatProfile;
    const classicStrike = host.travel.combat.tick(dt,cave.player,cave.monsters,
      cave.collision,profile.interval,profile.weapon,profile.ranged);
    // Ao alcance e sem mana: a magia não sai e a tela avisa uma vez (ADR 0069).
    if (host.travel.combat.takeBlocked() === "no-mana") host.hud.setTravelNotice(NO_MANA_MESSAGE);
    const follow = host.travel.autoFollow && !manualActive && host.travel.navigator.target === null;
    const caveMovement = follow
      ? host.travel.pursuit.direction(dt,cave.player,focused,cave.monsters,cave.collision,false,null,profile.followStop)
      : movement;
    cave.update(dt,caveMovement,attack || classicStrike,
      host.sim.inventory.loadout.equipped,host.sim.inventory.defense,
      // O alvo do golpe vai em TODOS os quadros, como na superfície: a magia sai depois do preparo, em outro quadro que o do pedido.
      host.travel.combat.strikeTargetId,
      host.sim.usesMana ? { staff: host.sim.equippedStaff, spend: cost => host.sim.spendMana(cost), gain: amount => host.sim.gainMana(amount), damagePercent: host.sim.gearBonus.damage } : undefined);
    host.input.acknowledgeMovement();
    host.sim.advanceClock(dt); // o tempo de volta dos monstros também anda dentro da masmorra (ADR 0029)
    // A magia do Mago também se vê na caverna: o projétil voa e o estouro mostra o dano (ADR 0070).
    host.effects.spells.update(paused ? 0 : dt, cave.player, cave.monsters.values());
    const changed = applyCaveVictories(host.sim, cave);
    if(changed)host.save();
  }
  const stairs=reachedStairsMove(cave);
  if(cave.player.hp<=0){
    host.leaveCave();
    host.sim.player.hp=0;
    host.save();
    host.hud.setTravelNotice("Você tombou na caverna. Renasça para continuar.");
  } else if(stairs==="leave"){
    host.leaveCave();
  } else if(stairs!==null){
    // Pisar na escada troca de andar; o quadro termina aqui e o novo andar aparece no próximo.
    host.changeCaveFloor(stairs);
    return true;
  } else {
    timers.saveClock += dt;
    if(timers.saveClock>12){timers.saveClock=0;host.save();}
    host.updateHud();
    host.hud.setCave({floor:cave.floor,floorIndex:cave.floorIndex,floorCount:cave.floorCount,
      floorName:cave.floorName,tileX:Math.floor(cave.player.x/TILE_SIZE),tileY:Math.floor(cave.player.y/TILE_SIZE)});
    host.hud.setNearbyAction(nearbyStairsMove(cave));
    if(timers.battleClock>=0.2){
      timers.battleClock=0;
      host.hud.setBattleCreatures(host.hudBattleRows(),host.travel.combat.targetId);
      host.hud.setCombatTarget(host.travel.combat.label(cave.monsters));
    }
    host.scene.renderCave(cave,host.camera.zoom,timers.clock,host.travel.navigator.target,
      host.sim.inventory.gear,host.sim.inventory.loadout.equipped,
      {heroClass:host.sim.heroClass,equippedStaff:host.sim.equippedStaff},host.effects.spells);
    return true;
  }
  return false;
}
