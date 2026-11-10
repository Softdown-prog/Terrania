import { currentMountQuestStep } from "../../engine/MountQuestState.ts";
import { caveEntranceNear } from "../../world/caves.ts";
import { nearestNpc } from "../../world/npcs.ts";
import { questStepId, surfaceNearbyAction } from "../interactions.ts";
import type { Frame, ModeHost } from "./types.ts";

/** Um quadro na superfície: simulação a 60 Hz, efeitos, câmera, HUD e desenho do mundo. */
export function tickSurface(host: ModeHost, frame: Frame): void {
  const { dt, paused, manualActive, tileRoute, still } = frame;
  const { timers } = host;
  const gelBefore = host.sim.inventory.gel;
  if (!paused) {
    timers.accumulator += dt;
    while (timers.accumulator >= 1 / 60) {
      timers.accumulator -= 1 / 60;
      const before = host.sim.player;
      const damageCount = before.damageCount;
      const classicStrike = host.travel.combat.tick(1 / 60, before, host.sim.slimes, host.sim.collision,
        host.sim.inventory.weapon.interval,host.sim.inventory.loadout.equipped);
      const follow = !manualActive && !tileRoute && host.travel.autoFollow;
      if (follow) host.travel.pursuit.direction(1 / 60, before, host.travel.combat.targetId,
        host.sim.slimes, host.sim.collision, true, host.travel.walker.destination);
      let routeTime = 1 / 60;
      const stepDirection = () => {
        if (manualActive) {
          const direction = host.input.movement();
          host.input.acknowledgeMovement();
          return direction;
        }
        if (tileRoute) {
          const dir = host.travel.navigator.direction(before, routeTime);
          routeTime = 0;
          return dir;
        }
        return follow ? host.travel.pursuit.direction(0, before, host.travel.combat.targetId,
          host.sim.slimes, host.sim.collision, true) : still;
      };
      const changed = host.sim.update(1 / 60, stepDirection,
        classicStrike, host.travel.combat.strikeTargetId, host.travel.walker);
      if (changed) host.save();
      if (host.sim.awaitingRespawn) {
        host.input.clear();
        host.travel.stopAll();
        timers.accumulator = 0;
        break;
      }
      if (before.damageCount !== damageCount) host.travel.navigator.cancel();
    }
  } else {
    timers.accumulator = 0;
  }
  const collectedGel = host.sim.inventory.gel - gelBefore;
  if (collectedGel > 0) host.effects.showGelPickup(host.sim.player, collectedGel);
  timers.saveClock += dt;
  if (timers.saveClock > 12) {
    timers.saveClock = 0;
    host.save();
  }
  const mobs = [...host.sim.slimes.values()];
  const feedback = host.effects.update(paused ? 0 : dt, host.sim.player, mobs);
  if (feedback.hit) host.camera.shake(0.25);
  if (feedback.hurt) host.camera.shake(0.65);
  host.camera.update(dt, host.sim.player);
  const focusedLabel = host.travel.combat.label(host.sim.slimes);
  const targetId = host.travel.combat.targetId;
  if (timers.battleClock >= 0.2) {
    timers.battleClock = 0;
    host.hud.setBattleCreatures(host.hudBattleRows(), targetId);
  }
  host.updateHud();
  const following = host.travel.pursuit.destination !== null;
  host.hud.setCombatTarget(focusedLabel && following
    ? focusedLabel + " · seguindo" : focusedLabel);
  const npc = nearestNpc(host.sim.player.x, host.sim.player.y);
  const portal = caveEntranceNear(host.sim.player.x,host.sim.player.y,host.sim.seed);
  host.hud.setNearbyAction(surfaceNearbyAction({
    x: host.sim.player.x, y: host.sim.player.y, stepId: questStepId(host.sim.mounts.quest),
    caveEntrance: portal !== null, npc,
  }));
  const quest = host.sim.mounts.quest;
  host.scene.render({
    world: host.world,
    camera: host.camera,
    player: host.sim.player,
    mobs,
    time: timers.clock,
    effects: host.effects,
    destination: host.travel.navigator.target,
    drops: [...host.sim.drops.values()],
    combatTargetId: targetId,
    playerGear: host.sim.inventory.gear,
    playerWeapon: host.sim.inventory.loadout.equipped,
    mount: host.sim.mounts.active,
    wildHorse: !host.sim.mounts.has("warhorse") && quest?.step!==4,
    stableBuilt: host.sim.mounts.stableTier>0,
    tracksVisible: !!quest && currentMountQuestStep(quest)?.id==="tracks",
    leadingHorse: !!quest && currentMountQuestStep(quest)?.id==="return",
  });
}
