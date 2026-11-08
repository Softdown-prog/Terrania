import { rollCreatureLoot } from "../actors/RegionalMonster.ts";
import { CREATURE_CATALOG } from "../actors/CreatureCatalog.ts";
import { grantExperience } from "../engine/Experience.ts";
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
import type { GameUi, NpcOffer, Preferences } from "../ui/GameUi.ts";
import { nearestNpc, npcDialogue } from "../world/npcs.ts";
import { aelaQuestProgress } from "../world/aelaQuest.ts";
import { POTION_GEL_PRICE, POTION_HEAL, QUEST_REWARD_POTIONS, type InventoryOutcome } from "../engine/Inventory.ts";
import { FOODS, type FoodId } from "../engine/Food.ts";
import { FORGE_SWORD_PRICE, WEAPONS, type WeaponId } from "../engine/Weapons.ts";
import type { GearId, GearSlot } from "../engine/Equipment.ts";
import { InteriorRoom } from "../engine/InteriorRoom.ts";
import { CaveRoom } from "../engine/CaveRoom.ts";
import { caveEntranceNear, type CaveEntrance } from "../world/caves.ts";
import { BUILDINGS } from "../world/village.ts";
import { TapNavigator } from "../engine/TapNavigator.ts";
import { ClassicCombat, nearestCombatCreature } from "../engine/ClassicCombat.ts";
import { ClassicPursuit } from "../engine/ClassicPursuit.ts";
import { ClassicTileWalker } from "../engine/ClassicTileWalker.ts";
import { TILE_SIZE } from "../world/terrain.ts";
import { levelForExperience } from "../engine/Experience.ts";
import { WILD_WARHORSE,WILD_APPLES,MOUNT_INTERACT_DISTANCE,
  sampleMountCaptureLoot,type MountAction,type MountActionResult } from "../engine/MountStable.ts";
import { visibleBattleCreatures } from "../engine/ClassicBattleList.ts";
import { experienceProgress } from "../engine/Experience.ts";

const NPC_ACTIONS = { character: "talk", sign: "read", door: "enter" } as const;
const INVENTORY_FEEDBACK: Record<InventoryOutcome, string> = {
  "healed": `Poção utilizada! Vida restaurada em até ${POTION_HEAL} pontos.`,
  "full-health": "Sua vida já está completa.",
  "no-potion": "Você não possui poções de cura.",
  "ate": "Refeição feita. Sua vida será recuperada gradualmente.",
  "no-food": "Esse alimento acabou na sua bolsa.",
  "eat-cooldown": "Aguarde alguns segundos antes de comer novamente.",
  "nutrition-full": "Você ainda está alimentado. Aguarde a recuperação antes de comer mais.",
  "food-traded": "Lina colocou o alimento na sua bolsa.",
  "food-stack-full": "A pilha desse alimento está cheia.",
  "unavailable": "Retorne à vila para continuar.",
  "too-far": "Aproxime-se de Lina perto da hospedaria para trocar.",
  "insufficient-gel": `Você precisa de ${POTION_GEL_PRICE} unidades de gel para a troca.`,
  "potions-full": "A pilha de poções está cheia.",
  "traded": "Lina colocou uma poção de cura na sua bolsa.",
  "purchased": `Toren colocou a ${WEAPONS.forge.name} na sua bolsa.`,
  "already-owned": "Você já possui essa espada.",
  "insufficient-sword-gel": `Você precisa de ${FORGE_SWORD_PRICE} unidades de gel para comprar a espada.`,
  "too-far-from-forge": "Aproxime-se de Toren para comprar a espada.",
  "equipped": "Espada equipada.",
  "already-equipped": "Essa espada já está equipada.",
  "not-owned": "Você ainda não possui essa espada.",
  "gear-equipped": "Item equipado.",
  "gear-removed": "Item guardado na bolsa.",
  "gear-unchanged": "O espaço já está assim.",
  "wrong-slot": "Este item pertence a outro espaço.",
};

/** Coordinates adapters. Shared simulations own movement, collision and combat. */
export class Game {
  private readonly input = new Input();
  private readonly lifecycle = new AbortController();
  private readonly camera = new Camera();
  private readonly effects = new Effects();
  private readonly navigator = new TapNavigator();
  private readonly classicCombat = new ClassicCombat();
  private readonly classicPursuit = new ClassicPursuit();
  private readonly tileWalker = new ClassicTileWalker();
  private classicAutoFollow = true;
  private battleClock = 0.25;
  private sim = new OfflineSimulation(842136);
  private world = new WorldRenderer(842136);
  private interior: InteriorRoom | null = null;
  private cave: CaveRoom | null = null;
  private saveClock = 0;
  private accumulator = 0;
  private clock = 0;
  constructor(private readonly scene: CanvasScene, private readonly hud: GameUi) {
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
        this.navigator.cancel();
      }
      this.accumulator = 0;
    }, { signal: this.lifecycle.signal });
    this.hud.onNewWorld(() => this.newWorld());
    this.hud.onPotionTrade(() => this.tradeGelForPotion());
    this.hud.onSwordPurchase(() => this.buySword());
    this.hud.onFoodUse(id => this.eatFood(id));
    this.hud.onFoodTrade(id => this.buyFood(id));
    this.hud.onWeaponEquip(weapon => this.equipWeapon(weapon));
    this.hud.onGearEquip((slot, item) => this.equipGear(slot, item));
    this.hud.onTalk(() => this.talkToNpc());
    this.hud.onMountAction(action=>this.mountAction(action));
    this.hud.onRespawn(() => this.respawn());
    this.hud.onPotionUse(() => {
      if (this.sim.awaitingRespawn || this.cave?.player.hp === 0) return INVENTORY_FEEDBACK.unavailable;
      if (!this.sim.inventory.usePotion(this.cave?.player ?? this.sim.player))
        return (this.cave?.player ?? this.sim.player).hp >= (this.cave?.player ?? this.sim.player).maxHp
          ? INVENTORY_FEEDBACK["full-health"] : INVENTORY_FEEDBACK["no-potion"];
      this.save();
      this.updateHud();
      return INVENTORY_FEEDBACK.healed;
    });
    this.updateHud();
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
      awaitingRespawn: this.sim.awaitingRespawn,
    }, aelaQuestProgress(kills));
    this.hud.updateInventory(inventory.gel, inventory.potion, inventory.food);
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
      this.battleCreatures(), this.sim.player, this.scene.battleViewport(this.camera),
    );
  }
  private selectBattleTarget(id: string): void {
    if (this.interior || this.hud.menuOpen || this.sim.awaitingRespawn ||
        !this.hudBattleRows().some(row => row.id === id)) return;
    this.selectTarget(id);
  }
  private selectTarget(id: string): void {
    if (!this.classicCombat.select(id, this.cave?.monsters ?? this.sim.slimes)) return;
    this.classicAutoFollow = true;
    this.classicPursuit.reset();
    this.navigator.cancel();
    this.hud.setBattleCreatures(this.hudBattleRows(), id);
  }
  private cancelTarget(): void {
    this.classicCombat.cancel();
    this.classicPursuit.reset();
    this.battleClock = 0.25;
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
    this.navigator.cancel();
    this.classicCombat.reset();
    this.classicPursuit.reset();
    this.tileWalker.reset();
    this.classicAutoFollow = true;
    this.battleClock = 0.25;
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
    this.accumulator = 0;
    this.hud.setSeed(seed);
  }
  private talkToNpc(): void {
    if (this.hud.menuOpen || this.sim.awaitingRespawn) return;
    this.navigator.cancel();
    if (this.cave) {
      if (this.cave.nearExit) this.leaveCave();
      return;
    }
    if (this.interior) {
      this.leaveInterior();
      return;
    }
    const {x,y}=this.sim.player;
    const nearby=(point:{readonly x:number;readonly y:number})=>
      Math.hypot(x-point.x,y-point.y)<=MOUNT_INTERACT_DISTANCE;
    if(this.sim.mounts.quest && nearby(WILD_WARHORSE)) {
      this.hud.setTravelNotice(this.mountAction('tame'));return;
    }
    if(this.sim.mounts.quest && nearby(WILD_APPLES)) {
      this.hud.setTravelNotice(this.mountAction('forage'));return;
    }
    const entrance = caveEntranceNear(this.sim.player.x, this.sim.player.y, this.sim.seed);
    if (entrance) { this.enterCave(entrance); return; }
    const npc = nearestNpc(this.sim.player.x, this.sim.player.y);
    if (!npc) return;
    this.input.clear();
    if (npc.kind === "door" && BUILDINGS.some(b => b.id === npc.id)) {
      this.classicCombat.cancel();
      this.classicPursuit.reset();
      this.hud.setCombatTarget(null);
      this.hud.setBattleCreatures([], null);
      this.tileWalker.reset();
      this.interior = new InteriorRoom(npc.id);
      this.accumulator = 0;
    } else {
      const rewarded = npc.id === "aela" && this.sim.inventory.claimAelaReward(this.sim.kills);
      if (rewarded) this.save();
      let offer: NpcOffer | undefined;
      if (npc.id === "lina") offer = { item: "potion", price: POTION_GEL_PRICE };
      else if (npc.id === "toren") offer = { item: "sword", price: FORGE_SWORD_PRICE };
      else if (npc.id === "stablemaster") offer = { item: "stable", price: 0 };
      const lines = npcDialogue(npc, this.sim.kills, offer?.item === "sword");
      this.hud.showNpcDialogue(npc.name, npc.role, rewarded
        ? [...lines, `Recompensa de Aela: ${QUEST_REWARD_POTIONS} poções de cura guardadas na sua bolsa!`]
        : lines, offer);
    }
  }

  /** Somente o motor confirma a compra, o domador e o inventário; a UI pede ações. */
  private mountAction(action:MountAction):string {
    if(this.cave||this.interior||this.sim.awaitingRespawn)return "Volte à superfície para cuidar das montarias.";
    const {player,mounts,inventory,kills}=this.sim;
    const lvl=levelForExperience(this.sim.experience),gel=inventory.gel;
    const spend=(amount:number)=>inventory.spendGel(amount);
    let result:MountActionResult;
    switch(action){
      case "build": case "upgrade":result=mounts.upgrade(lvl,gel,spend,player.x,player.y);break;
      case "train":result=mounts.train(lvl,player.x,player.y);break;
      case "start-warhorse":result=mounts.beginWarhorse(lvl,player.x,player.y);break;
      case "make-halter":result=mounts.craftHalter(gel,spend,player.x,player.y);break;
      case "forage":result=mounts.forage(player.x,player.y);break;
      case "tame":
        result=mounts.tame(lvl,kills,player.x,player.y);
        if(result==="tamed") for(const item of sampleMountCaptureLoot("warhorse",this.sim.seed))
          inventory.addMaterial(item);
        break;
      case "mount-warhorse":result=mounts.mount("warhorse",lvl,player.x,player.y);break;
      case "dismount":result=mounts.dismount();break;
    }
    const message:Record<MountActionResult,string>={
      built:"Cercado do estábulo construído. Agora você pode treinar Cavalaria I.",
      upgraded:"Estábulo ampliado. Novas montarias podem ser abrigadas.",
      trained:"Cavalaria elevada! Verifique suas missões de domesticação.",
      "quest-started":"Quest O Garrano Fugitivo iniciada. Afaste 5 slimes, colha maçã e prepare um cabresto.",
      "halter-made":"Cabresto preparado. Leve Maçã Silvestre ao cavalo fugitivo.",
      "apple-picked":"Maçã Silvestre colhida. Ainda é necessário um cabresto e cinco slimes derrotados.",
      tamed:"O cavalo aceitou você! Sela inicial obtida. Volte ao estábulo para montar.",
      mounted:"Cavalo de Batalha montado. Sua energia diminui ao galopar.",
      dismounted:"Você desmontou com segurança.",
      "no-level":"Seu nível ainda é baixo para essa etapa de Cavalaria.",
      "no-gel":"Gel insuficiente para construir ou fabricar.",
      "no-stable":"O cercado precisa ser construído ou ampliado primeiro.",
      "no-training":"É necessário Cavalaria adequada e nível suficiente.",
      "missing-quest":"Converse com o Mestre de Estábulos para iniciar a missão.",
      "quest-active":"Você já possui uma missão de domesticação em andamento.",
      "already-owned":"Essa montaria já foi conquistada.",
      "no-apple":"O cavalo está assustado. Encontre a Maçã Silvestre.",
      "no-halter":"Você precisa fabricar um cabresto no estábulo.",
      "slimes-needed":"Derrote cinco slimes antes de tentar acalmar o cavalo.",
      "too-far":"Aproxime-se do estábulo ou animal para essa ação.",
      unavailable:"Essa ação ainda não está disponível.",
      "stamina-low":"A montaria precisa descansar.",
    };
    if(["mounted","dismounted"].includes(result)) {
      this.tileWalker.reset();
      this.navigator.cancel();
    }
    if(["built","upgraded","trained","quest-started","halter-made","apple-picked","tamed","mounted","dismounted"].includes(result))this.save();
    this.updateHud();
    return message[result];
  }

  private tradeGelForPotion(): string {
    const { player, inventory } = this.sim;
    if (this.interior || !this.hud.menuOpen) return INVENTORY_FEEDBACK["too-far"];
    if (player.hp <= 0) return INVENTORY_FEEDBACK.unavailable;
    if (nearestNpc(player.x, player.y)?.id !== "lina") return INVENTORY_FEEDBACK["too-far"];
    const result = inventory.tradeGelForPotion();
    if (result === "traded") {
      this.save();
      this.updateHud();
    }
    return INVENTORY_FEEDBACK[result];
  }
  private eatFood(id: FoodId): string {
    if (this.sim.awaitingRespawn) return INVENTORY_FEEDBACK.unavailable;
    const outcome = this.sim.inventory.useFood(id, this.sim.player);
    if (outcome === "ate") { this.save(); this.updateHud(); }
    return outcome === "ate" ? `${FOODS[id].name}: ${INVENTORY_FEEDBACK.ate}` : INVENTORY_FEEDBACK[outcome];
  }
  private buyFood(id: FoodId): string {
    if (this.interior || !this.hud.menuOpen) return INVENTORY_FEEDBACK["too-far"];
    if (this.sim.awaitingRespawn) return INVENTORY_FEEDBACK.unavailable;
    if (nearestNpc(this.sim.player.x, this.sim.player.y)?.id !== "lina") return INVENTORY_FEEDBACK["too-far"];
    const outcome = this.sim.inventory.tradeGelForFood(id);
    if (outcome === "food-traded") { this.save(); this.updateHud(); }
    return outcome === "food-traded" ? `Lina entregou ${FOODS[id].name}.` : INVENTORY_FEEDBACK[outcome];
  }
  private buySword(): string {
    if (this.interior || !this.hud.menuOpen) return INVENTORY_FEEDBACK["too-far-from-forge"];
    const result = this.sim.inventory.buyForgeSword(this.sim.player);
    if (result === "purchased") {
      this.save();
      this.updateHud();
    }
    return INVENTORY_FEEDBACK[result];
  }
  private equipWeapon(weapon: WeaponId): string {
    if (this.sim.awaitingRespawn) return INVENTORY_FEEDBACK.unavailable;
    const result = this.sim.inventory.equipWeapon(weapon);
    if (result === "equipped") {
      this.save();
      this.updateHud();
    }
    return INVENTORY_FEEDBACK[result];
  }
  private equipGear(slot: GearSlot, item: GearId | null): string {
    if (this.sim.awaitingRespawn) return INVENTORY_FEEDBACK.unavailable;
    const result = this.sim.inventory.equipGear(slot, item);
    if (result === "gear-equipped" || result === "gear-removed") {
      this.save();
      this.updateHud();
    }
    return INVENTORY_FEEDBACK[result];
  }
  private enterCave(entrance:CaveEntrance):void {
    this.navigator.cancel();
    this.classicCombat.reset();
    this.classicPursuit.reset();
    this.tileWalker.reset();
    this.input.clear();
    this.accumulator=0;
    this.effects.reset();
    this.hud.setCombatTarget(null);
    this.hud.setBattleCreatures([],null);
    this.sim.mounts.dismount();
    this.cave=new CaveRoom(entrance,this.sim.player.hp,this.sim.player.maxHp);
    this.hud.setTravelNotice("Você desceu para "+entrance.name+". O mapa agora acompanha o primeiro andar da caverna.");
  }
  private leaveCave():void {
    if(this.cave) this.sim.player.hp=this.cave.player.hp;
    this.cave=null;
    this.hud.setCave(null);
    this.input.clear();
    this.navigator.cancel();
    this.tileWalker.reset();
    this.classicPursuit.reset();
    this.accumulator=0;
    this.camera.snap(this.sim.player.x,this.sim.player.y);
    this.hud.setTravelNotice("Você retornou à superfície pela mesma entrada.");
    this.updateHud();
  }
  private leaveInterior(): void {
    this.tileWalker.reset();
    this.navigator.cancel();
    this.classicPursuit.reset();
    this.interior = null;
    this.input.clear();
    this.accumulator = 0;
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
    saveLocal(this.sim.snapshot());
  }
  /** Called exclusively by the Phaser Scene; there is no second animation loop. */
  update(deltaSeconds: number): void {
    const dt = Number.isFinite(deltaSeconds) ? Math.max(0, Math.min(0.1, deltaSeconds)) : 0;
    this.clock += dt;
    this.battleClock += dt;
    if (this.input.consumeTalk() && !this.hud.menuOpen) this.talkToNpc();
    const paused = this.hud.menuOpen || document.hidden || this.sim.awaitingRespawn;
    if (paused) this.input.clear();
    const still = { x: 0, y: 0 };
    const manual = paused ? still : this.input.movement();
    const attack = !paused && this.input.consumeAttack(false);
    const stopTarget = this.input.consumeCancelTarget();
    if (stopTarget) this.cancelTarget();
    if (attack && !stopTarget && !this.interior && !this.cave) {
      if (!this.classicCombat.targetId)
        this.classicCombat.selectNearest(this.sim.player, this.sim.slimes.values());
      if (this.classicCombat.targetId) {
        this.classicAutoFollow = true;
        this.navigator.cancel();
      }
    }
    const manualActive = Math.hypot(manual.x, manual.y) >= 0.08;
    if (paused || manualActive) this.navigator.cancel();
    if (manualActive) this.classicPursuit.suspend();
    const tap = this.input.consumeTap();
    const walkByTiles = !this.interior && !this.cave;
    const committedStep = walkByTiles ? this.tileWalker.destination : null;
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
        const accepted = this.navigator.go(committedStep ?? player,
          walkByTiles ? this.tileCenter(destination) : destination, collision, walkByTiles);
        // A valid walk overrides chasing until the next creature selection.
        if (accepted && walkByTiles) {
          this.classicAutoFollow = false;
          this.classicPursuit.reset();
        }
      }
    }
    const controlled = this.cave?.player ?? this.interior?.player ?? this.sim.player;
    const tileRoute = walkByTiles && this.navigator.target !== null;
    const movement = paused ? still : manualActive ? manual : tileRoute ? still :
      this.navigator.target ? this.navigator.direction(controlled, dt) : still;
    if (this.cave) {
      const cave=this.cave;
      this.accumulator=0;
      if (!paused && dt > 0) {
        cave.update(dt,movement,attack,this.sim.inventory.loadout.equipped,this.sim.inventory.defense);
        this.input.acknowledgeMovement();
        let changed=false;
        for(const victory of cave.drainVictories()){
          this.sim.experience=grantExperience(this.sim.experience,CREATURE_CATALOG[victory.kind].experience,cave.player);
          this.sim.player.maxHp=cave.player.maxHp;
          for(const item of rollCreatureLoot(victory.kind,victory.id))
            changed=this.sim.inventory.addMaterial(item)||changed;
          changed=true;
        }
        if(changed)this.save();
      }
      if(cave.player.hp<=0){
        this.leaveCave();
        this.sim.player.hp=0;
        this.hud.setTravelNotice("Você tombou na caverna. Renasça para continuar.");
      } else if(cave.reachedExit)this.leaveCave();
      else {
        this.updateHud();
        this.hud.setCave({floor:cave.floor,
          tileX:Math.floor(cave.player.x/TILE_SIZE),tileY:Math.floor(cave.player.y/TILE_SIZE)});
        this.hud.setNearbyAction(cave.nearExit?"leave":null);
        this.hud.setBattleCreatures([],null);
        this.scene.renderCave(cave,this.camera.zoom,this.clock,this.navigator.target,
          this.sim.inventory.gear,this.sim.inventory.loadout.equipped);
        return;
      }
    }
    if (this.interior) {
      const room = this.interior;
      this.accumulator = 0;
      if (!paused && dt > 0) { room.update(dt, movement); this.input.acknowledgeMovement(); }
      if (room.reachedExit) this.leaveInterior();
      if (this.interior) {
        this.saveClock += dt;
        if (this.saveClock > 12) { this.saveClock = 0; this.save(); }
        this.updateHud();
        this.hud.setInterior(room.building.name);
        this.scene.renderInterior(room, this.navigator.target, this.clock);
        return;
      }
    }
    const gelBefore = this.sim.inventory.gel;
    if (!paused) {
      this.accumulator += dt;
      while (this.accumulator >= 1 / 60) {
        this.accumulator -= 1 / 60;
        const before = this.sim.player;
        const damageCount = before.damageCount;
        const classicStrike = this.classicCombat.tick(1 / 60, before, this.sim.slimes, this.sim.collision,
          this.sim.inventory.weapon.interval);
        const follow = !manualActive && !tileRoute && this.classicAutoFollow;
        if (follow) this.classicPursuit.direction(1 / 60, before, this.classicCombat.targetId,
          this.sim.slimes, this.sim.collision, true, this.tileWalker.destination);
        let routeTime = 1 / 60;
        const stepDirection = () => {
          if (manualActive) {
            const direction = this.input.movement();
            this.input.acknowledgeMovement();
            return direction;
          }
          if (tileRoute) {
            const dir = this.navigator.direction(before, routeTime);
            routeTime = 0;
            return dir;
          }
          return follow ? this.classicPursuit.direction(0, before, this.classicCombat.targetId,
            this.sim.slimes, this.sim.collision, true) : still;
        };
        const changed = this.sim.update(1 / 60, stepDirection,
          classicStrike, this.classicCombat.strikeTargetId, this.tileWalker);
        if (changed) this.save();
        if (this.sim.awaitingRespawn) {
          this.input.clear();
          this.navigator.cancel();
          this.classicCombat.reset();
          this.classicPursuit.reset();
          this.tileWalker.reset();
          this.accumulator = 0;
          break;
        }
        if (before.damageCount !== damageCount) this.navigator.cancel();
      }
    } else {
      this.accumulator = 0;
    }
    const collectedGel = this.sim.inventory.gel - gelBefore;
    if (collectedGel > 0) this.effects.showGelPickup(this.sim.player, collectedGel);
    this.saveClock += dt;
    if (this.saveClock > 12) {
      this.saveClock = 0;
      this.save();
    }
    const mobs = [...this.sim.slimes.values()];
    const feedback = this.effects.update(paused ? 0 : dt, this.sim.player, mobs);
    if (feedback.hit) this.camera.shake(0.25);
    if (feedback.hurt) this.camera.shake(0.65);
    this.camera.update(dt, this.sim.player);
    const focusedLabel = this.classicCombat.label(this.sim.slimes);
    const targetId = this.classicCombat.targetId;
    if (this.battleClock >= 0.2) {
      this.battleClock = 0;
      this.hud.setBattleCreatures(this.hudBattleRows(), targetId);
    }
    this.updateHud();
    const following = this.classicPursuit.destination !== null;
    this.hud.setCombatTarget(focusedLabel && following
      ? focusedLabel + " · seguindo" : focusedLabel);
    const npc = nearestNpc(this.sim.player.x, this.sim.player.y);
    const portal = caveEntranceNear(this.sim.player.x,this.sim.player.y,this.sim.seed);
    const q=this.sim.mounts.quest;
    const close=(point:{readonly x:number;readonly y:number})=>
      Math.hypot(this.sim.player.x-point.x,this.sim.player.y-point.y)<=MOUNT_INTERACT_DISTANCE;
    this.hud.setNearbyAction(q&&close(WILD_WARHORSE)?"tame":q&&!q.apple&&close(WILD_APPLES)?"forage":
      portal?"enter":npc?NPC_ACTIONS[npc.kind??"character"]:null);
    this.scene.render(
      this.world,
      this.camera,
      this.sim.player,
      mobs,
      this.clock,
      this.effects,
      this.navigator.target,
      [...this.sim.drops.values()],
      targetId,
      this.sim.inventory.gear,
      this.sim.inventory.loadout.equipped,
    );
  }
  destroy(): void {
    this.save();
    this.lifecycle.abort();
    this.input.destroy();
    this.navigator.cancel();
    this.classicPursuit.reset();
    this.tileWalker.reset();
    this.hud.setBattleCreatures([], null);
    this.world.clear();
    this.effects.reset();
  }
}
