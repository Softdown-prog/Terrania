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
import { QUEST_REWARD_POTIONS } from "../engine/character/Inventory.ts";
import { InteriorRoom, hasInterior } from "../engine/rooms/InteriorRoom.ts";
import { CaveRoom } from "../engine/rooms/CaveRoom.ts";
import { nearbyStairsMove, roomAfterMove } from "../engine/rooms/caveStairs.ts";
import type { CaveEntrance } from "../world/caves.ts";
import { dungeonEntranceNear } from "../world/entrances.ts";
import { nearestCombatCreature } from "../engine/combat/ClassicCombat.ts";
import { TILE_SIZE } from "../world/terrain.ts";
import { JOURNEY_ARRIVAL, nearestWalkable } from "../engine/movement/Journey.ts";
import { driveJourney, type JourneyEvent } from "./journeyDriver.ts";
import { JOURNEY_MESSAGES } from "./messages/journeyMessages.ts";
import type { MountAction } from "../engine/mounts/MountStable.ts";
import { runMountAction } from "../engine/mounts/MountActions.ts";
import { buyFood, buyStaff, buySword, eatFood, equipGear, equipStaff, equipWeapon, restAtInn, sellMaterial, tradeGelForPotion, usePotion,
  type ShopContext, type ShopResult } from "./actions/shopActions.ts";
import { craftElixir, drinkElixir } from "./actions/south/alchemyActions.ts";
import { TravelState } from "./TravelState.ts";
import type { Frame, FrameTimers, ModeHost } from "./modes/types.ts";
import { tickCave } from "./modes/caveMode.ts";
import { tickSurface } from "./modes/surfaceMode.ts";
import { tickInterior } from "./modes/interiorMode.ts";
import { mountQuestAction, npcOffer, questStepId } from "./interactions.ts";
import { bankDeposit, bankOnTalk, bankWithdraw } from "./actions/center/bankActions.ts";
import { chooseRespawnPoint } from "./actions/center/shrineActions.ts";
import { isHeroClassPlayable, manaMeter, type HeroClassId } from "../engine/character/classes/index.ts";
import { STAVES } from "../engine/character/Staves.ts";
import { BANKER_ID } from "../npcs/center/capital/index.ts";
import { MOUNT_BLOCKED_MESSAGE, MOUNT_MESSAGES } from "./messages/mountMessages.ts";
import { buildJournal } from "../engine/quests/journal/index.ts";
import { caveEntranceInCell } from "../world/caves.ts";
import { WELL_LINES } from "./messages/south/well/index.ts";
import { ROOTS_LINES } from "./messages/center/roots/index.ts";
import { nearestRootsDungeon } from "../world/nearestRootsDungeon.ts";
import { visibleBattleCreatures } from "../engine/combat/ClassicBattleList.ts";
import { experienceProgress, levelForExperience } from "../engine/character/Experience.ts";
import { collectDrops } from "../engine/character/loot.ts";


/** Coordinates adapters. Shared simulations own movement, collision and combat. */
/** Perto assim de uma criatura (em unidades) a viagem pelo mapa para: ela vai atacar. */
const JOURNEY_DANGER_RADIUS = 150;
export class Game {
  private readonly input = new Input();
  private readonly lifecycle = new AbortController();
  private readonly camera = new Camera();
  private readonly effects = new Effects();
  /** A vida do herói no quadro anterior da viagem: perder vida interrompe a viagem. */
  private journeyHp = 0;
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
    // Jogador novo (sem save deste mundo): escolhe o herói antes de jogar (ADR 0066).
    if (!saved || saved.seed !== seed) this.askHeroClass();
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
    this.hud.onInnRest(() => this.shop(restAtInn));
    this.hud.onShrineChoose(point => this.shop(context => chooseRespawnPoint(context, point)));
    this.hud.onBankDeposit(amount => this.shop(context => bankDeposit(context, amount)));
    this.hud.onBankWithdraw(amount => this.shop(context => bankWithdraw(context, amount)));
    this.hud.onMaterialSale((market, material, quantity) => this.shop(context => sellMaterial(context, market, material, quantity)));
    this.hud.onElixirCraft(id => this.shop(context => craftElixir(context, id)));
    this.hud.onElixirUse(id => this.shop(context => drinkElixir(context, id)));
    this.hud.onFoodUse(id => this.shop(context => eatFood(context, id)));
    this.hud.onFoodTrade(id => this.shop(context => buyFood(context, id)));
    this.hud.onWeaponEquip(weapon => this.shop(context => equipWeapon(context, weapon)));
    this.hud.onStaffEquip(staff => this.shop(context => equipStaff(context, staff)));
    this.hud.onStaffBuy(staff => this.shop(context => buyStaff(context, staff)));
    this.hud.onGearEquip((slot, item) => this.shop(context => equipGear(context, slot, item)));
    this.hud.onTalk(() => this.talkToNpc());
    this.hud.onMountAction(action=>this.mountAction(action));
    this.hud.onRespawn(() => this.respawn());
    this.hud.onPotionUse(() => this.shop(usePotion));
    this.hud.onJourneyStart((tileX, tileY) => this.startJourney(tileX, tileY));
    this.hud.onJourneyCancel(() => this.cancelJourney());
    this.updateHud();
  }
  private createHost(): ModeHost {
    const game = this; // `sim` e `world` são trocados a cada mundo novo: lidos sempre daqui, nunca copiados
    return {
      get sim() { return game.sim; }, get world() { return game.world; },
      input: this.input, travel: this.travel, hud: this.hud, scene: this.scene,
      camera: this.camera, effects: this.effects, timers: this.timers,
      save: () => this.save(), updateHud: () => this.updateHud(), hudBattleRows: () => this.hudBattleRows(),
      leaveCave: () => this.leaveCave(), changeCaveFloor: move => this.changeCaveFloor(move),
      leaveInterior: () => this.leaveInterior(),
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
      heroClass: this.sim.heroClass,
      equippedStaff: this.sim.equippedStaff,
      mana: this.sim.usesMana ? manaMeter(this.sim.mana, this.sim.maxMana, STAVES[this.sim.equippedStaff].manaCost) : null,
    });
    const mounts = this.sim.mounts.view(kills), starter = caveEntranceInCell(0, 0, this.sim.seed);
    // A entrada da Masmorra das Raízes mais perto só importa enquanto a Raiz Velha está em andamento (a procura é cara para fazer a cada quadro).
    const rootsDungeon = this.sim.roots.view.accepted && !this.sim.roots.view.bossDown ? nearestRootsDungeon(this.sim.seed, Math.floor(player.x / TILE_SIZE), Math.floor(player.y / TILE_SIZE)) : null;
    this.hud.updateJournal(buildJournal({
      trainingKills: this.sim.trainingKills, clearingRewardClaimed: inventory.questRewardClaimed, mounts, level: levelForExperience(this.sim.experience),
      well: this.sim.well.view, roots: this.sim.roots.view, ...(starter ? { trainingCave: { x: starter.x, y: starter.y } } : {}),
      ...(rootsDungeon ? { rootsDungeon: { x: rootsDungeon.x, y: rootsDungeon.y } } : {}),
    }));
    this.hud.updateInventory(inventory.gel, inventory.potion, inventory.food, inventory.materials, inventory.coins, inventory.elixirs);
    this.hud.updateBank(this.sim.bank.balance);
    this.hud.updateRespawnPoint(this.sim.respawnPoint);
    this.hud.updateLoadout(inventory.loadout);
    this.hud.updateStaves(inventory.staves);
    this.hud.updateGear(inventory.gear);
    this.hud.updateMount(mounts);
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
  /** Viajar pelo mapa (ADR 0099): o destino é um ponto do atlas, em tiles; cai no chão andável mais perto e o herói vai sozinho, em trechos. */
  private startJourney(tileX: number, tileY: number): string {
    if (this.cave || this.interior) return JOURNEY_MESSAGES.outside;
    if (this.sim.awaitingRespawn || this.sim.player.hp <= 0) return JOURNEY_MESSAGES.down;
    if (!Number.isFinite(tileX) || !Number.isFinite(tileY)) return JOURNEY_MESSAGES.blocked;
    const walkable = nearestWalkable({ x: (Math.floor(tileX) + .5) * TILE_SIZE, y: (Math.floor(tileY) + .5) * TILE_SIZE }, this.sim.collision);
    if (!walkable) return JOURNEY_MESSAGES.blocked;
    const goal = this.tileCenter(walkable), player = this.sim.player;
    const remaining = Math.hypot(goal.x - player.x, goal.y - player.y);
    if (remaining < JOURNEY_ARRIVAL) return JOURNEY_MESSAGES.here;
    this.travel.stopSteps();
    this.travel.journey.start(goal);
    // Como num toque no chão: a perseguição fica suspensa até o próximo alvo.
    this.travel.autoFollow = false;
    this.travel.pursuit.reset();
    this.journeyHp = player.hp;
    this.hud.setJourney(Math.round(remaining / TILE_SIZE));
    return JOURNEY_MESSAGES.started(Math.round(remaining / TILE_SIZE));
  }
  private cancelJourney(): void {
    if (!this.travel.journey.active) return;
    this.travel.journey.cancel();
    this.travel.navigator.cancel();
    this.hud.setJourney(null);
    this.hud.setTravelNotice(JOURNEY_MESSAGES.cancelled);
  }
  /** Um quadro da viagem: pede o próximo trecho, para ao chegar, no perigo ou sem caminho, e mantém o aviso de quanto falta. */
  private tickJourney(): void {
    const journey = this.travel.journey;
    if (this.cave || this.interior) { if (journey.active) { journey.cancel(); this.hud.setJourney(null); } return; }
    if (!journey.active) return;
    const player = this.sim.player;
    const hurt = player.hp < this.journeyHp - .001;
    this.journeyHp = player.hp;
    const threatened = nearestCombatCreature(player, this.battleCreatures(), JOURNEY_DANGER_RADIUS) !== null;
    const event: JourneyEvent = driveJourney({
      journey, navigator: this.travel.navigator, collision: this.sim.collision, from: this.travel.walker.destination ?? player,
      tileSteps: true, snap: point => this.tileCenter(point), hurt, threatened,
    });
    if (event) { this.hud.setJourney(null); this.hud.setTravelNotice(JOURNEY_MESSAGES[event]); return; }
    if (this.timers.battleClock >= .2) this.hud.setJourney(Math.round(journey.remaining(player) / TILE_SIZE));
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
  /** Abre a tela de escolha do herói; o jogo fica pausado até o jogador escolher. */
  private askHeroClass(): void { this.hud.promptHeroClass(heroClass => this.startAs(heroClass)); }
  /** Começa o mundo atual com a vocação escolhida e já salva, para a tela não voltar na próxima abertura. */
  private startAs(heroClass: HeroClassId): void {
    if (!isHeroClassPlayable(heroClass)) return;
    if (heroClass !== this.sim.heroClass) this.replaceWorld(this.sim.seed, undefined, heroClass);
    this.save();
    this.updateHud();
  }
  private replaceWorld(seed: number, saved?: OfflineSave, startingClass?: HeroClassId): void {
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
    this.sim = new OfflineSimulation(seed, saved, startingClass);
    this.camera.snap(this.sim.player.x, this.sim.player.y);
    this.effects.reset();
    this.timers.accumulator = 0;
    this.hud.setSeed(seed);
  }
  private talkToNpc(): void {
    if (this.hud.menuOpen || this.sim.awaitingRespawn) return;
    this.travel.navigator.cancel();
    if (this.cave) {
      const move = nearbyStairsMove(this.cave);
      if (move === "leave") this.leaveCave();
      else if (move) this.changeCaveFloor(move);
      return;
    }
    if (this.interior) {
      this.leaveInterior();
      return;
    }
    const mountStep = mountQuestAction(this.sim.player.x, this.sim.player.y, questStepId(this.sim.mounts.quest));
    if (mountStep) { this.hud.setTravelNotice(this.mountAction(mountStep)); return; }
    const entrance = dungeonEntranceNear(this.sim.player.x, this.sim.player.y, this.sim.seed);
    if (entrance) { this.enterCave(entrance); return; }
    const npc = nearestNpc(this.sim.player.x, this.sim.player.y, this.timers.clock);
    if (!npc) return;
    this.input.clear();
    if (npc.kind === "door" && hasInterior(npc.id)) {
      this.travel.combat.cancel();
      this.travel.pursuit.reset();
      this.hud.setCombatTarget(null);
      this.hud.setBattleCreatures([], null);
      this.travel.walker.reset();
      this.interior = new InteriorRoom(npc.id);
      this.timers.accumulator = 0;
    } else {
      const rewarded = npc.id === "aela" && this.sim.inventory.claimAelaReward(this.sim.trainingKills);
      if (rewarded) this.save();
      const offer = npcOffer(npc.id, this.sim.heroClass);
      const lines = npcDialogue(npc, this.sim.trainingKills, offer?.item === "sword");
      const well = this.sim.well.talk(npc.id, this.sim.inventory);
      if (well.changed) { this.save(); this.updateHud(); }
      // A segunda missão de Aela, a Raiz Velha (ADR 0104), só depois da recompensa da clareira.
      const roots = this.sim.roots.talk(npc.id, this.sim.inventory, this.sim.inventory.questRewardClaimed && !rewarded);
      if (roots.changed) { this.save(); this.updateHud(); }
      // O banqueiro paga os juros devidos ao começar a conversa (ADR 0063).
      const bank = npc.id === BANKER_ID ? bankOnTalk(this.sim) : null;
      if (bank?.changed) { this.save(); this.updateHud(); }
      const extra = [...(bank?.line ? [bank.line] : []),...(rewarded ? [`Recompensa de Aela: ${QUEST_REWARD_POTIONS} poções de cura guardadas na sua bolsa!`] : []),
        ...(well.event ? WELL_LINES[well.event] : []),...(roots.event ? ROOTS_LINES[roots.event] : [])];
      this.hud.showNpcDialogue(npc.name, npc.role, extra.length ? [...lines, ...extra] : lines, offer);
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
      menuOpen: this.hud.menuOpen, caveHeroDown: this.cave?.player.hp === 0, effectsEnabled: this.effects.enabled,
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
    this.sim.expireDefeats(); // quem já podia voltar volta antes de a masmorra ser povoada (ADR 0029)
    this.cave=new CaveRoom(entrance,this.sim.player.hp,this.sim.player.maxHp,this.sim.defeated);
    this.cave.player.syncAdventureStateFrom(this.sim.player);
    this.hud.setTravelNotice((entrance.tower ? "Você entrou em " : "Você desceu para ")+entrance.name+(this.cave.floorCount>1
      ? ". Andar 1 de "+this.cave.floorCount+": "+this.cave.floorName+"."
      : ". O mapa agora acompanha o primeiro andar da caverna."));
  }
  private changeCaveFloor(move:"descend"|"ascend"):void {
    if(!this.cave) return;
    collectDrops(this.cave.drops,this.cave.player,this.sim.inventory,true); // trocar de andar não perde o que ficou no chão
    this.sim.expireDefeats();
    const next=roomAfterMove(this.cave,move,this.sim.defeated);
    this.travel.stopAll();
    this.input.clear();
    this.timers.accumulator=0;
    this.effects.reset();
    this.hud.setCombatTarget(null);
    this.hud.setBattleCreatures([],null);
    this.cave=next;
    this.hud.setTravelNotice((move==="descend"?"Você desceu":"Você subiu")+" para o andar "+next.floorIndex+
      " de "+next.floorCount+": "+next.floorName+".");
    this.save();
  }
  private leaveCave():void {
    if(this.cave) {
      collectDrops(this.cave.drops,this.cave.player,this.sim.inventory,true); // nem sair da caverna
      this.sim.player.syncAdventureStateFrom(this.cave.player);
    }
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
    // Mundo novo: o herói é escolhido agora, e só a escolha salva (ADR 0066).
    this.askHeroClass();
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
        this.cancelJourney();
      }
    }
    const manualActive = Math.hypot(manual.x, manual.y) >= 0.08;
    if (paused || manualActive) this.travel.navigator.cancel();
    if (manualActive) this.cancelJourney(); // apertar uma tecla de andar assume o controle: a viagem para
    if (manualActive) this.travel.pursuit.suspend();
    const tap = this.input.consumeTap();
    const walkByTiles = !this.interior && !this.cave;
    const committedStep = walkByTiles ? this.travel.walker.destination : null;
    if (tap && !paused && !manualActive && !attack) {
      this.cancelJourney(); // um toque no chão ou numa criatura assume o controle
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
    this.tickJourney();
    const controlled = this.cave?.player ?? this.interior?.player ?? this.sim.player;
    const tileRoute = walkByTiles && this.travel.navigator.target !== null;
    const movement = paused ? still : manualActive ? manual : tileRoute ? still :
      this.travel.navigator.target ? this.travel.navigator.direction(controlled, dt) : still;
    const frame: Frame = { dt, paused, movement, attack, manualActive, tileRoute, still };
    if (this.cave && tickCave(this.host, this.cave, frame)) return;
    if (this.interior && tickInterior(this.host, this.interior, frame)) return;
    tickSurface(this.host, frame);
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
