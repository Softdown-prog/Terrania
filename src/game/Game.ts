import { Input } from "../input/Input.ts";
import { MultiplayerClient } from "../net/MultiplayerClient.ts";
import type { HeroState, InventoryAction, InventoryOutcome } from "../shared/protocol.ts";
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
import { POTION_GEL_PRICE, POTION_HEAL, QUEST_REWARD_POTIONS } from "../engine/Inventory.ts";
import { FOODS, emptyFoodCounts, type FoodId } from "../engine/Food.ts";
import { FORGE_SWORD_PRICE, WEAPONS, type WeaponId } from "../engine/Weapons.ts";
import type { GearId, GearSlot } from "../engine/Equipment.ts";
import { InteriorRoom } from "../engine/InteriorRoom.ts";
import { BUILDINGS } from "../world/village.ts";
import { TapNavigator } from "../engine/TapNavigator.ts";
import { ClassicCombat, nearestCombatCreature } from "../engine/ClassicCombat.ts";
import { CREATURE_CATALOG } from "../actors/CreatureCatalog.ts";
import { ClassicPursuit } from "../engine/ClassicPursuit.ts";
import { ClassicTileWalker } from "../engine/ClassicTileWalker.ts";
import { TILE_SIZE } from "../world/terrain.ts";
import { visibleBattleCreatures } from "../engine/ClassicBattleList.ts";
import { experienceProgress, maxHpForExperience, normalizeExperience } from "../engine/Experience.ts";

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
  private multiplayer: MultiplayerClient | null = null;
  private interior: InteriorRoom | null = null;
  private networkClock = 0;
  private pendingAttack = false;
  private offlineSnapshot: OfflineSave | null = null;
  private onlineExperience: number | null = null;
  private saveClock = 0;
  private accumulator = 0;
  private clock = 0;
  private hasJoinedOnline = false;
  private lastReportedRespawns: number | null = null;
  constructor(private readonly scene: CanvasScene, private readonly hud: GameUi, multiplayerUrl: string) {
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
    this.hud.setOnline(false);
    const url = multiplayerUrl;
    if (url && !["solo", "classico"].includes(params.get("modo") ?? "")) {
      this.multiplayer = new MultiplayerClient(
        url,
        params.get("room") ?? "origins",
        (serverSeed) => this.setOnlineWorld(serverSeed),
        (self) => this.applySnapshot(self),
        (status) => this.updateConnectionStatus(status),
        ({ action, outcome }) => {
          this.updateHud(true);
          this.hud.setInventoryFeedback(action === "trade-potion" || action === "buy-sword" || action.startsWith("buy-") ? "npc" : "bag",
            INVENTORY_FEEDBACK[outcome]);
          if (action === "use-potion") this.hud.setQuickPotionFeedback(INVENTORY_FEEDBACK[outcome]);
        },
      );
    } else this.hud.setStatus("Offline · aventura local");
    window.addEventListener("pagehide", () => this.save(), { signal: this.lifecycle.signal });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.save();
        this.input.clear();
        this.navigator.cancel();
        this.multiplayer?.cancelWalk();
        this.multiplayer?.cancelTarget();
        this.multiplayer?.sendInput(0, 0, false);
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
    this.hud.onRespawn(() => this.respawn());
    this.hud.onPotionUse(() => {
      if (this.multiplayer?.connected) {
        if (!this.multiplayer.roomInventory) return "A bolsa está disponível apenas no modo solo.";
        return this.requestRoomInventory("use-potion");
      }
      if (this.sim.awaitingRespawn) return INVENTORY_FEEDBACK.unavailable;
      if (!this.sim.inventory.usePotion(this.sim.player))
        return this.sim.player.hp >= this.sim.player.maxHp
          ? INVENTORY_FEEDBACK["full-health"] : INVENTORY_FEEDBACK["no-potion"];
      this.save();
      this.updateHud(false);
      return INVENTORY_FEEDBACK.healed;
    });
    this.updateHud(false);
  }
  private updateHud(online: boolean): void {
    const { player, kills } = this.sim;
    const inventory = online ? this.multiplayer?.inventory : this.sim.inventory;
    const experience = online ? this.onlineExperience : this.sim.experience;
    this.hud.updateHero({
      hp: player.hp,
      maxHp: player.maxHp,
      nutrition: online ? this.multiplayer?.inventory?.nutrition ?? { reserve: 0, elapsed: 0, cooldown: 0 } : player.nutrition,
      tileX: Math.floor(player.x / TILE_SIZE),
      tileY: Math.floor(player.y / TILE_SIZE),
      progression: experience === null ? null : experienceProgress(experience),
      awaitingRespawn: !online && this.sim.awaitingRespawn,
    }, aelaQuestProgress(kills));
    this.hud.updateInventory(inventory?.gel ?? 0, inventory?.potion ?? 0, !!inventory,
      online && this.multiplayer?.inventoryPending === true, inventory?.food ?? emptyFoodCounts());
    this.hud.updateLoadout(inventory?.loadout ?? null);
    this.hud.updateGear(inventory?.gear ?? null);
    // Remote positions are visual only, already filtered by the online room.
    this.hud.setMapPlayers(online && this.multiplayer?.connected
      ? this.multiplayer.players
        .filter(other => other.id !== this.multiplayer?.id && other.hp > 0)
        .map(other => ({ id: other.id, tileX: Math.floor(other.x / TILE_SIZE),
          tileY: Math.floor(other.y / TILE_SIZE) }))
      : []);
  }
  /** Battle entries are derived from the same camera/viewport as the canvas. */
  private battleCreatures() {
    if (this.multiplayer?.connected)
      return this.multiplayer.mobs.map(mob => ({ ...mob, kind: "slime" as const }));
    return this.sim.slimes.values();
  }
  private hudBattleRows() {
    return visibleBattleCreatures(
      this.battleCreatures(), this.sim.player, this.scene.battleViewport(this.camera),
    );
  }
  private selectBattleTarget(id: string): void {
    if (this.interior || this.hud.menuOpen || (!this.multiplayer?.connected && this.sim.awaitingRespawn) ||
        !this.hudBattleRows().some(row => row.id === id)) return;
    this.selectTarget(id);
  }
  private selectTarget(id: string): void {
    if (this.multiplayer?.connected) {
      this.multiplayer.selectTarget(id);
      return;
    }
    if (!this.classicCombat.select(id, this.sim.slimes)) return;
    this.classicAutoFollow = true;
    this.classicPursuit.reset();
    this.navigator.cancel();
    this.hud.setBattleCreatures(this.hudBattleRows(), id);
  }
  private cancelTarget(): void {
    this.multiplayer?.cancelTarget();
    this.classicCombat.cancel();
    this.classicPursuit.reset();
    this.pendingAttack = false;
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
    this.pendingAttack = false;
    this.navigator.cancel();
    this.classicCombat.reset();
    this.classicPursuit.reset();
    this.tileWalker.reset();
    this.classicAutoFollow = true;
    this.battleClock = 0.25;
    this.hud.setBattleCreatures([], null);
    this.hud.setCombatTarget(null);
    this.interior = null;
    this.world.clear();
    this.world = new WorldRenderer(seed);
    this.sim = new OfflineSimulation(seed, saved);
    this.onlineExperience = null;
    this.camera.snap(this.sim.player.x, this.sim.player.y);
    this.effects.reset();
    this.accumulator = 0;
    this.hud.setSeed(seed);
  }
  private updateConnectionStatus(status: string): void {
    this.hud.setStatus(status);
    if (status.startsWith("Offline") && this.offlineSnapshot) {
      this.replaceWorld(this.offlineSnapshot.seed, this.offlineSnapshot);
      this.offlineSnapshot = null;
      this.hud.setOnline(false);
      this.hud.setTargetCombat(true);
      this.updateHud(false);
    }
  }
  private setOnlineWorld(seed: number): void {
    const reconnecting = this.hasJoinedOnline;
    this.hasJoinedOnline = true;
    this.lastReportedRespawns = null;
    if (!this.offlineSnapshot) this.offlineSnapshot = this.sim.snapshot();
    this.save();
    this.networkClock = 0;
    this.pendingAttack = false;
    this.replaceWorld(seed);
    this.hud.setOnline(true);
    this.hud.setTargetCombat(this.multiplayer?.targetCombat === true);
    if (reconnecting) this.hud.setTravelNotice(
      "A conexão foi refeita e uma nova sessão online começou na origem. O progresso da sala é temporário.");
    this.updateHud(true);
  }
  private applySnapshot(self: HeroState): void {
    if (typeof self.respawns === "number" && Number.isSafeInteger(self.respawns) && self.respawns >= 0) {
      if (this.lastReportedRespawns !== null && self.respawns > this.lastReportedRespawns)
        this.hud.setTravelNotice("Seu personagem morreu e o servidor o trouxe de volta à origem.");
      this.lastReportedRespawns = self.respawns;
    }
    const player = this.sim.player;
    const experience = normalizeExperience(self.experience);
    this.onlineExperience = self.experience === experience ? experience : null;
    player.maxHp = maxHpForExperience(this.onlineExperience ?? 0);
    player.hp = Math.min(player.maxHp, self.hp);
    this.sim.kills = self.kills;
    this.hud.setPlayerCount(this.multiplayer?.players.length ?? 1, true);
    if (this.multiplayer?.tileMovement) return;

    const distance = Math.hypot(self.x - player.x, self.y - player.y);
    // A correção autoritativa pode invalidar uma rota local iniciada por toque.
    if (distance > 100) this.navigator.cancel();
    const factor = distance > 100 ? 1 : 0.35;
    player.x += (self.x - player.x) * factor;
    player.y += (self.y - player.y) * factor;
    player.hurtTime = Math.max(player.hurtTime, self.hurtTime ?? 0);
    if (Math.hypot(player.vx, player.vy) < 5) {
      player.faceX = self.faceX;
      player.faceY = self.faceY;
    }
    player.attackTime = Math.max(player.attackTime, self.attackTime);
  }
  private updateOnlineView(dt: number, multiplayer: MultiplayerClient): void {
    multiplayer.interpolate(dt);
    const self = multiplayer.tileMovement ? multiplayer.self : undefined;
    if (!self) return;
    const player = this.sim.player;
    player.x = self.x; player.y = self.y;
    player.vx = self.vx ?? 0; player.vy = self.vy ?? 0;
    player.faceX = self.faceX; player.faceY = self.faceY;
    player.walkTime = self.walkTime;
    player.attackTime = self.attackTime;
    player.attackWeapon = self.attackWeapon === "forge" ? "forge" : "starter";
    player.hurtTime = self.hurtTime ?? 0;
  }
  private talkToNpc(): void {
    if (this.hud.menuOpen || (!this.multiplayer?.connected && this.sim.awaitingRespawn)) return;
    this.navigator.cancel();
    if (this.interior) {
      this.leaveInterior();
      return;
    }
    const npc = nearestNpc(this.sim.player.x, this.sim.player.y);
    if (!npc) return;
    this.input.clear();
    this.multiplayer?.cancelWalk();
    this.multiplayer?.cancelTarget();
    this.multiplayer?.sendInput(0, 0, false);
    if (npc.kind === "door" && BUILDINGS.some(b => b.id === npc.id)) {
      this.classicCombat.cancel();
      this.classicPursuit.reset();
      this.hud.setCombatTarget(null);
      this.hud.setBattleCreatures([], null);
      this.tileWalker.reset();
      this.interior = new InteriorRoom(npc.id);
      this.accumulator = 0;
      this.pendingAttack = false;
    } else {
      const rewarded = npc.id === "aela" && !this.multiplayer?.connected &&
        this.sim.inventory.claimAelaReward(this.sim.kills);
      if (rewarded) this.save();
      const online = this.multiplayer?.connected === true;
      const canForge = !online || !!this.multiplayer?.inventory?.loadout;
      let offer: NpcOffer | undefined;
      if (npc.id === "lina" && (!online || this.multiplayer?.roomInventory))
        offer = { item: "potion", price: POTION_GEL_PRICE };
      else if (npc.id === "toren" && canForge) offer = { item: "sword", price: FORGE_SWORD_PRICE };
      const lines = npcDialogue(npc, this.sim.kills, offer?.item === "sword");
      this.hud.showNpcDialogue(npc.name, npc.role, rewarded
        ? [...lines, `Recompensa de Aela: ${QUEST_REWARD_POTIONS} poções de cura guardadas na sua bolsa!`]
        : lines, offer);
    }
  }
  private tradeGelForPotion(): string {
    const { player, inventory } = this.sim;
    if (this.interior || !this.hud.menuOpen) return INVENTORY_FEEDBACK["too-far"];
    if (this.multiplayer?.connected) {
      if (!this.multiplayer.roomInventory) return "A troca está disponível com Lina na aventura solo.";
      return this.requestRoomInventory("trade-potion");
    }
    if (player.hp <= 0) return INVENTORY_FEEDBACK.unavailable;
    if (nearestNpc(player.x, player.y)?.id !== "lina") return INVENTORY_FEEDBACK["too-far"];
    const result = inventory.tradeGelForPotion();
    if (result === "traded") {
      this.save();
      this.updateHud(false);
    }
    return INVENTORY_FEEDBACK[result];
  }
  private eatFood(id: FoodId): string {
    if (this.multiplayer?.connected) return this.requestRoomInventory(`eat-${id}`);
    if (this.sim.awaitingRespawn) return INVENTORY_FEEDBACK.unavailable;
    const outcome = this.sim.inventory.useFood(id, this.sim.player);
    if (outcome === "ate") { this.save(); this.updateHud(false); }
    return outcome === "ate" ? `${FOODS[id].name}: ${INVENTORY_FEEDBACK.ate}` : INVENTORY_FEEDBACK[outcome];
  }
  private buyFood(id: FoodId): string {
    if (this.interior || !this.hud.menuOpen) return INVENTORY_FEEDBACK["too-far"];
    if (this.multiplayer?.connected) return this.requestRoomInventory(`buy-${id}`);
    if (this.sim.awaitingRespawn) return INVENTORY_FEEDBACK.unavailable;
    if (nearestNpc(this.sim.player.x, this.sim.player.y)?.id !== "lina") return INVENTORY_FEEDBACK["too-far"];
    const outcome = this.sim.inventory.tradeGelForFood(id);
    if (outcome === "food-traded") { this.save(); this.updateHud(false); }
    return outcome === "food-traded" ? `Lina entregou ${FOODS[id].name}.` : INVENTORY_FEEDBACK[outcome];
  }
  private buySword(): string {
    if (this.interior || !this.hud.menuOpen) return INVENTORY_FEEDBACK["too-far-from-forge"];
    if (this.multiplayer?.connected) return this.requestRoomInventory("buy-sword");
    const result = this.sim.inventory.buyForgeSword(this.sim.player);
    if (result === "purchased") {
      this.save();
      this.updateHud(false);
    }
    return INVENTORY_FEEDBACK[result];
  }
  private equipWeapon(weapon: WeaponId): string {
    if (this.multiplayer?.connected) return this.requestRoomInventory(weapon === "forge" ? "equip-forge" : "equip-starter");
    if (this.sim.awaitingRespawn) return INVENTORY_FEEDBACK.unavailable;
    const result = this.sim.inventory.equipWeapon(weapon);
    if (result === "equipped") {
      this.save();
      this.updateHud(false);
    }
    return INVENTORY_FEEDBACK[result];
  }
  private requestRoomInventory(action: InventoryAction): string {
    if (!this.multiplayer?.requestInventory(action)) return "A bolsa da sala está indisponível no momento.";
    this.updateHud(true);
    return "Aguardando confirmação da sala…";
  }
  private equipGear(slot: GearSlot, item: GearId | null): string {
    if (this.multiplayer?.connected) {
      if (!this.multiplayer.requestGear(slot, item)) return "O equipamento da sala está indisponível no momento.";
      this.updateHud(true);
      return "Aguardando confirmação da sala…";
    }
    if (this.sim.awaitingRespawn) return INVENTORY_FEEDBACK.unavailable;
    const result = this.sim.inventory.equipGear(slot, item);
    if (result === "gear-equipped" || result === "gear-removed") {
      this.save();
      this.updateHud(false);
    }
    return INVENTORY_FEEDBACK[result];
  }
  private leaveInterior(): void {
    this.tileWalker.reset();
    this.navigator.cancel();
    this.classicPursuit.reset();
    this.interior = null;
    this.input.clear();
    this.accumulator = 0;
    this.pendingAttack = false;
    this.camera.snap(this.sim.player.x, this.sim.player.y);
  }
  private newWorld(): void {
    if (this.multiplayer?.connected) return;
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
    if (this.multiplayer?.connected || !this.sim.respawn()) return;
    this.input.clear();
    this.camera.snap(this.sim.player.x, this.sim.player.y);
    this.effects.reset();
    this.save();
    this.updateHud(false);
  }
  private save(): void {
    // The temporary online world must never overwrite the player's solo save.
    // Persist its last solo checkpoint even when leaving an active online room.
    const solo = this.offlineSnapshot ?? (this.multiplayer?.connected ? null : this.sim.snapshot());
    if (solo) saveLocal(solo);
  }
  /** Called exclusively by the Phaser Scene; there is no second animation loop. */
  update(deltaSeconds: number): void {
    const dt = Number.isFinite(deltaSeconds) ? Math.max(0, Math.min(0.1, deltaSeconds)) : 0;
    this.clock += dt;
    this.battleClock += dt;
    const online = this.multiplayer?.connected === true;
    const onlineTiles = this.multiplayer?.tileMovement === true;
    const targetCombat = !online || this.multiplayer?.targetCombat === true;
    if (this.input.consumeTalk() && !this.hud.menuOpen) this.talkToNpc();
    const paused = this.hud.menuOpen || document.hidden || (!online && this.sim.awaitingRespawn);
    if (paused) this.input.clear();
    const still = { x: 0, y: 0 };
    const manual = paused ? still : this.input.movement();
    const attack = !paused && this.input.consumeAttack(!targetCombat);
    const stopTarget = this.input.consumeCancelTarget();
    if (stopTarget) this.cancelTarget();
    if (online && paused) {
      this.multiplayer?.cancelTarget();
      this.pendingAttack = false;
    }
    if (!online && attack && !stopTarget && !this.interior) {
      if (!this.classicCombat.targetId)
        this.classicCombat.selectNearest(this.sim.player, this.sim.slimes.values());
      if (this.classicCombat.targetId) {
        this.classicAutoFollow = true;
        this.navigator.cancel();
      }
    }
    const manualActive = Math.hypot(manual.x, manual.y) >= 0.08;
    if (paused || manualActive || (!targetCombat && attack)) this.navigator.cancel();
    if (onlineTiles && (paused || manualActive || (!targetCombat && attack)))
      this.multiplayer?.cancelWalk();
    if (!online && manualActive) this.classicPursuit.suspend();
    const tap = this.input.consumeTap();
    const walkByTiles = !online && !this.interior;
    const committedStep = walkByTiles ? this.tileWalker.destination : null;
    if (tap && !paused && !manualActive && !attack) {
      const destination = this.interior
        ? this.scene.interiorPoint(tap)
        : this.scene.worldPoint(tap, this.camera);
      const player = this.interior?.player ?? this.sim.player;
      const collision = this.interior?.collision ?? this.sim.collision;
      const creature = destination && targetCombat && !this.interior
        ? nearestCombatCreature(destination, this.battleCreatures()) : null;
      if (creature) {
        this.selectTarget(creature.id);
      } else if (destination && onlineTiles && !this.interior) {
        this.multiplayer?.walkTo(destination);
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
    const controlled = this.interior?.player ?? this.sim.player;
    const tileRoute = walkByTiles && this.navigator.target !== null;
    const movement = paused ? still : manualActive ? manual : tileRoute ? still :
      this.navigator.target ? this.navigator.direction(controlled, dt) : still;
    this.pendingAttack ||= online && attack && !stopTarget;
    if (this.interior) {
      const room = this.interior;
      this.pendingAttack = false; // combate indisponível em locais seguros
      this.accumulator = 0;
      if (!paused && dt > 0) { room.update(dt, movement); this.input.acknowledgeMovement(); }
      if (room.reachedExit) this.leaveInterior();
      if (this.interior) {
        if (online && this.multiplayer) {
          this.networkClock += dt;
          if (this.networkClock >= 0.05) {
            this.networkClock %= 0.05;
            this.multiplayer.sendInput(0, 0, false);
          }
          this.updateOnlineView(dt, this.multiplayer);
        } else {
          this.saveClock += dt;
          if (this.saveClock > 12) { this.saveClock = 0; this.save(); }
        }
        this.updateHud(online);
        this.hud.setInterior(room.building.name);
        this.scene.renderInterior(room, this.navigator.target, this.clock);
        return;
      }
    }
    const gelBefore = this.sim.inventory.gel;
    if (!paused || online) {
      this.accumulator += dt;
      while (this.accumulator >= 1 / 60) {
        this.accumulator -= 1 / 60;
        if (online) {
          // Legacy backends still use the continuous prediction path.
          if (!onlineTiles) {
            this.sim.player.update(1 / 60, movement, this.sim.collision);
            if (this.pendingAttack) this.sim.player.startAttack();
          }
        } else {
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
            this.pendingAttack = false;
            break;
          }
          if (before.damageCount !== damageCount) this.navigator.cancel();
          this.pendingAttack = false;
        }
      }
    } else {
      this.accumulator = 0;
      this.pendingAttack = false;
    }
    const collectedGel = this.sim.inventory.gel - gelBefore;
    if (collectedGel > 0) this.effects.showGelPickup(this.sim.player, collectedGel);
    if (online && this.multiplayer) {
      this.networkClock += dt;
      if (this.networkClock >= 0.05) {
        this.networkClock %= 0.05;
        this.multiplayer.sendInput(movement.x, movement.y, this.pendingAttack);
        this.input.acknowledgeMovement();
        this.pendingAttack = false;
      }
      this.updateOnlineView(dt, this.multiplayer);
    } else {
      this.saveClock += dt;
      if (this.saveClock > 12) {
        this.saveClock = 0;
        this.save();
      }
      this.hud.setPlayerCount(1, false);
    }
    const mobs =
      online && this.multiplayer
        ? this.multiplayer.mobs
        : [...this.sim.slimes.values()];
    const feedback = this.effects.update(
      paused && !online ? 0 : dt,
      this.sim.player,
      mobs,
    );
    if (feedback.hit) this.camera.shake(0.25);
    if (feedback.hurt) this.camera.shake(0.65);
    this.camera.update(dt, this.sim.player);
    const onlineFocus = this.multiplayer?.combatFocus;
    const focusedLabel = online
      ? onlineFocus && mobs.some(mob => mob.id === onlineFocus.id && mob.hp > 0)
        ? CREATURE_CATALOG.slime.name : null
      : this.classicCombat.label(this.sim.slimes);
    const targetId = online ? onlineFocus?.id ?? null : this.classicCombat.targetId;
    if (targetCombat && this.battleClock >= 0.2) {
      this.battleClock = 0;
      this.hud.setBattleCreatures(
        this.hudBattleRows(), targetId,
      );
    }
    this.updateHud(online);
    const following = online ? onlineFocus?.following : this.classicPursuit.destination !== null;
    this.hud.setCombatTarget(focusedLabel && following
      ? focusedLabel + " · seguindo" : focusedLabel);
    const npc = nearestNpc(this.sim.player.x, this.sim.player.y);
    this.hud.setNearbyAction(npc ? NPC_ACTIONS[npc.kind ?? "character"] : null);
    this.scene.render(
      this.world,
      this.camera,
      this.sim.player,
      mobs,
      online && this.multiplayer ? this.multiplayer.players : [],
      online ? (this.multiplayer?.id ?? null) : null,
      this.clock,
      this.effects,
      onlineTiles ? this.multiplayer?.walkTarget ?? null : this.navigator.target,
      online ? this.multiplayer?.inventory?.drops ?? [] : [...this.sim.drops.values()],
      targetId,
      online ? this.multiplayer?.inventory?.gear ?? {} : this.sim.inventory.gear,
      online ? this.multiplayer?.inventory?.loadout?.equipped ?? 'starter' : this.sim.inventory.loadout.equipped,
    );
  }
  destroy(): void {
    this.save();
    this.lifecycle.abort();
    this.input.destroy();
    this.multiplayer?.disconnect();
    this.navigator.cancel();
    this.classicPursuit.reset();
    this.tileWalker.reset();
    this.hud.setBattleCreatures([], null);
    this.world.clear();
    this.effects.reset();
  }
}
