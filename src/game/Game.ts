import { Input } from "../input/Input.ts";
import { WorldRenderer } from "../render/WorldRenderer.ts";
import { Camera } from "../render/Camera.ts";
import { Effects } from "../render/Effects.ts";
import {
  OfflineSimulation,
  type OfflineSave,
} from "../engine/OfflineSimulation.ts";
import { loadLocalSave, saveLocal } from "../storage/localSave.ts";
import { CanvasScene } from "../ui/CanvasScene.ts";
import type { GameUi, Preferences } from "../ui/GameUi.ts";
import { nearestNpc, npcDialogue } from "../world/npcs.ts";
import { aelaQuestProgress } from "../world/aelaQuest.ts";
import { QUEST_REWARD_POTIONS } from "../engine/Inventory.ts";
import { InteriorRoom } from "../engine/InteriorRoom.ts";
import { CaveRoom } from "../engine/CaveRoom.ts";
import { caveEntranceNear, type CaveEntrance } from "../world/caves.ts";
import { BUILDINGS } from "../world/village.ts";
import { nearestCombatCreature } from "../engine/ClassicCombat.ts";
import { TILE_SIZE } from "../world/terrain.ts";
import type { MountAction } from "../engine/MountStable.ts";
import { runMountAction } from "../engine/MountActions.ts";
import { applyCaveVictories } from "../engine/CaveRewards.ts";
import { buyFood, buySword, eatFood, equipGear, equipWeapon, tradeGelForPotion, usePotion,
  type ShopContext, type ShopResult } from "./actions/shopActions.ts";
import { TravelState } from "./TravelState.ts";
import type { Frame, FrameTimers, ModeHost } from "./modes/types.ts";
import { tickInterior } from "./modes/interiorMode.ts";
import { mountQuestAction, npcOffer, questStepId, surfaceNearbyAction } from "./interactions.ts";
import { MOUNT_BLOCKED_MESSAGE, MOUNT_MESSAGES } from "./messages/mountMessages.ts";
import { currentMountQuestStep } from "../engine/MountQuestState.ts";
import { visibleBattleCreatures } from "../engine/ClassicBattleList.ts";
import { experienceProgress } from "../engine/Experience.ts";


/** Coordinates adapters. Shared simulations own movement, collision and combat. */
export class Game {
  private readonly input = new Input();
  private readonly lifecycle = new AbortController();
  private readonly camera = new Camera();
  private readonly effects = new Effects();
  private readonly travel = new TravelState();
  private readonly timers: FrameTimers = { clock: 0, battleClock: 0.25, saveClock: 0, accumulator: 0 };
  /** A única porta pela qual os arquivos de `modes/` alcançam o jogo. */
  private readonly host: ModeHost;
  private sim = new OfflineSimulation(842136);
  private world = new WorldRenderer(842136);
  private interior: InteriorRoom | null = null;
  private cave: CaveRoom | null = null;
  constructor(private readonly scene: CanvasScene, private readonly hud: GameUi) {
    this.host = this.createHost();
    const saved = loadLocalSave(),
      params = new URLSearchParams(location.search);
    this.hud.setTargetCombat(true);
    this.hud.onStopCombat(() => this.cancelTarget());
    this.hud.onBattleSelect((id) => this.selectBattleTarget(id));
    const requestedSeed = params.get("seed");
    const parsed =
      requestedSeed !== null && /^\d+$/.test(requestedSeed)
        ? Number(requestedSeed)
        : NaN;
    const seed =
      Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 4294967295
        ? parsed
        : (saved?.seed ?? 842136);
    this.replaceWorld(seed, saved && saved.seed === seed ? saved : undefined);
    const preferences = this.hud.loadPreferences();
    this.configure(preferences);
    this.camera.zoom = preferences.zoom;
    this.hud.onPreferences((p) => this.configure(p));
    window.addEventListener("pagehide", () => this.save(), { signal: this.lifecycle.signal });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.save();
        this.input.clear();
        this.travel.navigator.cancel();
      }
      this.timers.accumulator = 0;
    }, { signal: this.lifecycle.signal });
    this.hud.onNewWorld(() => this.newWorld());
    this.hud.onPotionTrade(() => this.shop(tradeGelForPotion));
    this.hud.onSwordPurchase(() => this.shop(buySword));
    this.hud.onFoodUse(id => this.shop(context => eatFood(context, id)));
    this.hud.onFoodTrade(id => this.shop(context => buyFood(context, id)));
    this.hud.onWeaponEquip(weapon => this.shop(context => equipWeapon(context, weapon)));
    this.hud.onGearEquip((slot, item) => this.shop(context => equipGear(context, slot, item)));
    this.hud.onTalk(() => this.talkToNpc());
    this.hud.onMountAction(action=>this.mountAction(action));
    this.hud.onRespawn(() => this.respawn());
    this.hud.onPotionUse(() => this.shop(usePotion));
    this.updateHud();
  }
  private createHost(): ModeHost {
    const game = this; // `sim` e `world` são trocados a cada mundo novo: lidos sempre daqui, nunca copiados
    return {
      get sim() { return game.sim; }, get world() { return game.world; },
      input: this.input, travel: this.travel, hud: this.hud, scene: this.scene,
      camera: this.camera, effects: this.effects, timers: this.timers,
      save: () => this.save(), updateHud: () => this.updateHud(), hudBattleRows: () => this.hudBattleRows(),
      leaveCave: () => this.leaveCave(), leaveInterior: () => this.leaveInterior(),
    };
  }
  private updateHud(): void {
    const { kills, inventory } = this.sim;
    const player = this.cave?.player ?? this.sim.player;
    this.hud.updateHero({
      hp: player.hp,
      maxHp: player.maxHp,
      nutrition: player.nutrition,
      tileX: Math.floor(player.x / TILE_SIZE),
      tileY: Math.floor(player.y / TILE_SIZE),
      progression: experienceProgress(this.sim.experience),
      awaitingRespawn: player.hp <= 0,
    }, aelaQuestProgress(kills));
    this.hud.updateInventory(inventory.gel, inventory.potion, inventory.food, inventory.materials);
    this.hud.updateLoadout(inventory.loadout);
    this.hud.updateGear(inventory.gear);
    this.hud.updateMount(this.sim.mounts.view(kills));
  }
  /** Battle entries are derived from the same camera/viewport as the canvas. */
  private battleCreatures() {
    return this.cave?.monsters.values() ?? this.sim.slimes.values();
  }
  private hudBattleRows() {
    return visibleBattleCreatures(
      this.battleCreatures(), this.cave?.player ?? this.sim.player,
      this.cave ? this.scene.caveBattleViewport(this.cave,this.camera.zoom) : this.scene.battleViewport(this.camera),
    );
  }
  private selectBattleTarget(id: string): void {
    if (this.interior || this.hud.menuOpen || this.sim.awaitingRespawn ||
        !this.hudBattleRows().some(row => row.id === id)) return;
    this.selectTarget(id);
  }
  private selectTarget(id: string): void {
    if (!this.travel.combat.select(id, this.cave?.monsters ?? this.sim.slimes)) return;
    this.travel.autoFollow = true;
    this.travel.pursuit.reset();
    this.travel.navigator.cancel();
    this.hud.setBattleCreatures(this.hudBattleRows(), id);
  }
  private cancelTarget(): void {
    this.travel.combat.cancel();
    this.travel.pursuit.reset();
    this.timers.battleClock = 0.25;
    this.hud.setCombatTarget(null);
  }
  private tileCenter(point: { x: number; y: number }): { x: number; y: number } {
    return {
      x: (Math.floor(point.x / TILE_SIZE) + 0.5) * TILE_SIZE,
      y: (Math.floor(point.y / TILE_SIZE) + 0.5) * TILE_SIZE,
    };
  }
  private configure(p: Preferences): void {
    this.camera.setZoom(p.zoom);
    this.camera.reducedMotion = !p.cameraMotion;
    this.effects.enabled = p.effects;
  }
  private replaceWorld(seed: number, saved?: OfflineSave): void {
    this.input.clear();
    this.travel.stopAll();
    this.travel.autoFollow = true;
    this.timers.battleClock = 0.25;
    this.hud.setBattleCreatures([], null);
    this.hud.setCombatTarget(null);
    this.interior = null;
    this.cave = null;
    this.hud.setCave(null);
    this.world.clear();
    this.world = new WorldRenderer(seed);
    this.sim = new OfflineSimulation(seed, saved);
    this.camera.snap(this.sim.player.x, this.sim.player.y);
    this.effects.reset();
    this.timers.accumulator = 0;
    this.hud.setSeed(seed);
  }
  private talkToNpc(): void {
    if (this.hud.menuOpen || this.sim.awaitingRespawn) return;
    this.travel.navigator.cancel();
    if (this.cave) {
      if (this.cave.nearExit) this.leaveCave();
      return;
    }
    if (this.interior) {
      this.leaveInterior();
      return;
    }
    const mountStep = mountQuestAction(this.sim.player.x, this.sim.player.y, questStepId(this.sim.mounts.quest));
    if (mountStep) { this.hud.setTravelNotice(this.mountAction(mountStep)); return; }
    const entrance = caveEntranceNear(this.sim.player.x, this.sim.player.y, this.sim.seed);
    if (entrance) { this.enterCave(entrance); return; }
    const npc = nearestNpc(this.sim.player.x, this.sim.player.y);
    if (!npc) return;
    this.input.clear();
    if (npc.kind === "door" && BUILDINGS.some(b => b.id === npc.id)) {
      this.travel.combat.cancel();
      this.travel.pursuit.reset();
      this.hud.setCombatTarget(null);
      this.hud.setBattleCreatures([], null);
      this.travel.walker.reset();
      this.interior = new InteriorRoom(npc.id);
      this.timers.accumulator = 0;
    } else {
      const rewarded = npc.id === "aela" && this.sim.inventory.claimAelaReward(this.sim.kills);
      if (rewarded) this.save();
      const offer = npcOffer(npc.id);
      const lines = npcDialogue(npc, this.sim.kills, offer?.item === "sword");
      this.hud.showNpcDialogue(npc.name, npc.role, rewarded
        ? [...lines, `Recompensa de Aela: ${QUEST_REWARD_POTIONS} poções de cura guardadas na sua bolsa!`]
        : lines, offer);
    }
  }

  /** O motor (`runMountAction`) decide e confirma; aqui só se aplicam os efeitos no jogo. */
  private mountAction(action: MountAction): string {
    if (this.cave || this.interior || this.sim.awaitingRespawn) return MOUNT_BLOCKED_MESSAGE;
    const outcome = runMountAction(this.sim, action);
    if (outcome.stopMovement) this.travel.stopSteps();
    if (outcome.persist) this.save();
    this.updateHud();
    return MOUNT_MESSAGES[outcome.result];
  }

  /** Roda uma ação de loja ou bolsa; só quando a bolsa muda é que se salva e se atualiza o HUD. */
  private shop(run: (context: ShopContext) => ShopResult): string {
    const result = run({
      sim: this.sim, hero: this.cave?.player ?? this.sim.player, inInterior: !!this.interior,
      menuOpen: this.hud.menuOpen, caveHeroDown: this.cave?.player.hp === 0,
    });
    if (result.changed) { this.save(); this.updateHud(); }
    return result.message;
  }
  private enterCave(entrance:CaveEntrance):void {
    this.travel.stopAll();
    this.input.clear();
    this.timers.accumulator=0;
    this.effects.reset();
    this.hud.setCombatTarget(null);
    this.hud.setBattleCreatures([],null);
    this.sim.mounts.dismount();
    this.cave=new CaveRoom(entrance,this.sim.player.hp,this.sim.player.maxHp,this.sim.defeated);
    this.cave.player.syncAdventureStateFrom(this.sim.player);
    this.hud.setTravelNotice("Você desceu para "+entrance.name+". O mapa agora acompanha o primeiro andar da caverna.");
  }
  private leaveCave():void {
    if(this.cave) this.sim.player.syncAdventureStateFrom(this.cave.player);
    this.cave=null;
    this.travel.stopAll();
    this.travel.autoFollow=false;
    this.hud.setCombatTarget(null);
    this.hud.setBattleCreatures([],null);
    this.hud.setCave(null);
    this.input.clear();
    this.timers.accumulator=0;
    this.camera.snap(this.sim.player.x,this.sim.player.y);
    this.hud.setTravelNotice("Você retornou à superfície pela mesma entrada.");
    this.save();
    this.updateHud();
  }
  private leaveInterior(): void {
    this.travel.stopMotion();
    this.interior = null;
    this.input.clear();
    this.timers.accumulator = 0;
    this.camera.snap(this.sim.player.x, this.sim.player.y);
  }
  private newWorld(): void {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    const seed = values[0] ?? 842136;
    this.replaceWorld(seed);
    const url = new URL(location.href);
    url.searchParams.set("seed", String(seed));
    history.replaceState(null, "", url);
    this.save();
  }
  private respawn(): void {
    if (!this.sim.respawn()) return;
    this.input.clear();
    this.camera.snap(this.sim.player.x, this.sim.player.y);
    this.effects.reset();
    this.save();
    this.updateHud();
  }
  private save(): void {
    // Reloading in a dungeon resumes at its entrance, with the actual earned
    // health/nutrition/status outcome, never a stale pre-dungeon copy.
    if (this.cave) this.sim.player.syncAdventureStateFrom(this.cave.player);
    saveLocal(this.sim.snapshot());
  }
  /** Called exclusively by the Phaser Scene; there is no second animation loop. */
  update(deltaSeconds: number): void {
    const dt = Number.isFinite(deltaSeconds) ? Math.max(0, Math.min(0.1, deltaSeconds)) : 0;
    this.timers.clock += dt;
    this.timers.battleClock += dt;
    if (this.input.consumeTalk() && !this.hud.menuOpen) this.talkToNpc();
    const paused = this.hud.menuOpen || document.hidden || this.sim.awaitingRespawn;
    if (paused) this.input.clear();
    const still = { x: 0, y: 0 };
    const manual = paused ? still : this.input.movement();
    const attack = !paused && this.input.consumeAttack(false);
    const stopTarget = this.input.consumeCancelTarget();
    if (stopTarget) this.cancelTarget();
    if (attack && !stopTarget && !this.interior) {
      if (!this.travel.combat.targetId)
        this.travel.combat.selectNearest(this.cave?.player ?? this.sim.player,
          this.cave?.monsters.values() ?? this.sim.slimes.values());
      if (this.travel.combat.targetId) {
        this.travel.autoFollow = true;
        this.travel.navigator.cancel();
      }
    }
    const manualActive = Math.hypot(manual.x, manual.y) >= 0.08;
    if (paused || manualActive) this.travel.navigator.cancel();
    if (manualActive) this.travel.pursuit.suspend();
    const tap = this.input.consumeTap();
    const walkByTiles = !this.interior && !this.cave;
    const committedStep = walkByTiles ? this.travel.walker.destination : null;
    if (tap && !paused && !manualActive && !attack) {
      const destination = this.cave
        ? this.scene.cavePoint(tap,this.cave,this.camera.zoom)
        : this.interior ? this.scene.interiorPoint(tap)
        : this.scene.worldPoint(tap, this.camera);
      const player = this.cave?.player ?? this.interior?.player ?? this.sim.player;
      const collision = this.cave?.collision ?? this.interior?.collision ?? this.sim.collision;
      const creature = destination && !this.interior
        ? nearestCombatCreature(destination, this.battleCreatures()) : null;
      if (creature) {
        this.selectTarget(creature.id);
      } else if (destination) {
        const accepted = this.travel.navigator.go(committedStep ?? player,
          walkByTiles ? this.tileCenter(destination) : destination, collision, walkByTiles);
        // A valid walk overrides chasing until the next creature selection.
        if (accepted && walkByTiles) {
          this.travel.autoFollow = false;
          this.travel.pursuit.reset();
        }
      }
    }
    const controlled = this.cave?.player ?? this.interior?.player ?? this.sim.player;
    const tileRoute = walkByTiles && this.travel.navigator.target !== null;
    const movement = paused ? still : manualActive ? manual : tileRoute ? still :
      this.travel.navigator.target ? this.travel.navigator.direction(controlled, dt) : still;
    const frame: Frame = { dt, paused, movement, attack, manualActive, tileRoute, still };
    if (this.cave && this.tickCave(this.cave, frame)) return;
    if (this.interior && tickInterior(this.host, this.interior, frame)) return;
    this.tickSurface(frame);
  }
  /** Um quadro na caverna: `true` = terminou aqui; `false` = o herói saiu (escada ou queda) e a superfície ainda roda NESTE quadro. */
  private tickCave(cave: CaveRoom, frame: Frame): boolean {
    const { dt, paused, movement, attack, manualActive } = frame;
    this.timers.accumulator=0;
    if (!paused && dt > 0) {
      const focused = this.travel.combat.targetId;
      const classicStrike = this.travel.combat.tick(dt,cave.player,cave.monsters,
        cave.collision,this.sim.inventory.weapon.interval,this.sim.inventory.loadout.equipped);
      const follow = this.travel.autoFollow && !manualActive && this.travel.navigator.target === null;
      const caveMovement = follow
        ? this.travel.pursuit.direction(dt,cave.player,focused,cave.monsters,cave.collision)
        : movement;
      cave.update(dt,caveMovement,attack || classicStrike,
        this.sim.inventory.loadout.equipped,this.sim.inventory.defense,
        classicStrike ? this.travel.combat.strikeTargetId : undefined);
      this.input.acknowledgeMovement();
      const changed = applyCaveVictories(this.sim, cave);
      if(changed)this.save();
    }
    if(cave.player.hp<=0){
      this.leaveCave();
      this.sim.player.hp=0;
      this.save();
      this.hud.setTravelNotice("Você tombou na caverna. Renasça para continuar.");
    } else if(cave.reachedExit){
      this.leaveCave();
    } else {
      this.timers.saveClock += dt;
      if(this.timers.saveClock>12){this.timers.saveClock=0;this.save();}
      this.updateHud();
      this.hud.setCave({floor:cave.floor,
        tileX:Math.floor(cave.player.x/TILE_SIZE),tileY:Math.floor(cave.player.y/TILE_SIZE)});
      this.hud.setNearbyAction(cave.nearExit?"leave":null);
      if(this.timers.battleClock>=0.2){
        this.timers.battleClock=0;
        this.hud.setBattleCreatures(this.hudBattleRows(),this.travel.combat.targetId);
        this.hud.setCombatTarget(this.travel.combat.label(cave.monsters));
      }
      this.scene.renderCave(cave,this.camera.zoom,this.timers.clock,this.travel.navigator.target,
        this.sim.inventory.gear,this.sim.inventory.loadout.equipped);
      return true;
    }
    return false;
  }
  /** Um quadro na superfície: simulação a 60 Hz, efeitos, câmera, HUD e desenho do mundo. */
  private tickSurface(frame: Frame): void {
    const { dt, paused, manualActive, tileRoute, still } = frame;
    const gelBefore = this.sim.inventory.gel;
    if (!paused) {
      this.timers.accumulator += dt;
      while (this.timers.accumulator >= 1 / 60) {
        this.timers.accumulator -= 1 / 60;
        const before = this.sim.player;
        const damageCount = before.damageCount;
        const classicStrike = this.travel.combat.tick(1 / 60, before, this.sim.slimes, this.sim.collision,
          this.sim.inventory.weapon.interval,this.sim.inventory.loadout.equipped);
        const follow = !manualActive && !tileRoute && this.travel.autoFollow;
        if (follow) this.travel.pursuit.direction(1 / 60, before, this.travel.combat.targetId,
          this.sim.slimes, this.sim.collision, true, this.travel.walker.destination);
        let routeTime = 1 / 60;
        const stepDirection = () => {
          if (manualActive) {
            const direction = this.input.movement();
            this.input.acknowledgeMovement();
            return direction;
          }
          if (tileRoute) {
            const dir = this.travel.navigator.direction(before, routeTime);
            routeTime = 0;
            return dir;
          }
          return follow ? this.travel.pursuit.direction(0, before, this.travel.combat.targetId,
            this.sim.slimes, this.sim.collision, true) : still;
        };
        const changed = this.sim.update(1 / 60, stepDirection,
          classicStrike, this.travel.combat.strikeTargetId, this.travel.walker);
        if (changed) this.save();
        if (this.sim.awaitingRespawn) {
          this.input.clear();
          this.travel.stopAll();
          this.timers.accumulator = 0;
          break;
        }
        if (before.damageCount !== damageCount) this.travel.navigator.cancel();
      }
    } else {
      this.timers.accumulator = 0;
    }
    const collectedGel = this.sim.inventory.gel - gelBefore;
    if (collectedGel > 0) this.effects.showGelPickup(this.sim.player, collectedGel);
    this.timers.saveClock += dt;
    if (this.timers.saveClock > 12) {
      this.timers.saveClock = 0;
      this.save();
    }
    const mobs = [...this.sim.slimes.values()];
    const feedback = this.effects.update(paused ? 0 : dt, this.sim.player, mobs);
    if (feedback.hit) this.camera.shake(0.25);
    if (feedback.hurt) this.camera.shake(0.65);
    this.camera.update(dt, this.sim.player);
    const focusedLabel = this.travel.combat.label(this.sim.slimes);
    const targetId = this.travel.combat.targetId;
    if (this.timers.battleClock >= 0.2) {
      this.timers.battleClock = 0;
      this.hud.setBattleCreatures(this.hudBattleRows(), targetId);
    }
    this.updateHud();
    const following = this.travel.pursuit.destination !== null;
    this.hud.setCombatTarget(focusedLabel && following
      ? focusedLabel + " · seguindo" : focusedLabel);
    const npc = nearestNpc(this.sim.player.x, this.sim.player.y);
    const portal = caveEntranceNear(this.sim.player.x,this.sim.player.y,this.sim.seed);
    this.hud.setNearbyAction(surfaceNearbyAction({
      x: this.sim.player.x, y: this.sim.player.y, stepId: questStepId(this.sim.mounts.quest),
      caveEntrance: portal !== null, npc,
    }));
    this.scene.render(
      this.world,
      this.camera,
      this.sim.player,
      mobs,
      this.timers.clock,
      this.effects,
      this.travel.navigator.target,
      [...this.sim.drops.values()],
      targetId,
      this.sim.inventory.gear,
      this.sim.inventory.loadout.equipped,
      this.sim.mounts.active,
      !this.sim.mounts.has("warhorse") && this.sim.mounts.quest?.step!==4,
      this.sim.mounts.stableTier>0,
      !!this.sim.mounts.quest && currentMountQuestStep(this.sim.mounts.quest)?.id==="tracks",
      !!this.sim.mounts.quest && currentMountQuestStep(this.sim.mounts.quest)?.id==="return",
    );
  }
  destroy(): void {
    this.save();
    this.lifecycle.abort();
    this.input.destroy();
    this.travel.stopMotion();
    this.hud.setBattleCreatures([], null);
    this.world.clear();
    this.effects.reset();
  }
}
