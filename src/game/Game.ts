import { Input } from "../input/Input.ts";
import { MultiplayerClient } from "../net/MultiplayerClient.ts";
import type { HeroState } from "../shared/protocol.ts";
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
import { BUILDINGS } from "../world/village.ts";
import { TapNavigator } from "../engine/TapNavigator.ts";
import { ClassicCombat } from "../engine/ClassicCombat.ts";
import { ClassicPursuit } from "../engine/ClassicPursuit.ts";
import { ClassicTileWalker } from "../engine/ClassicTileWalker.ts";
import { TILE_SIZE } from "../world/terrain.ts";
import { visibleBattleCreatures } from "../engine/ClassicBattleList.ts";

/** Coordinates adapters. Shared simulations own movement, collision and combat. */
export class Game {
  private readonly input = new Input();
  private readonly lifecycle = new AbortController();
  private readonly camera = new Camera();
  private readonly effects = new Effects();
  private readonly navigator = new TapNavigator();
  private readonly classicCombat = new ClassicCombat();
  private readonly classicPursuit = new ClassicPursuit();
  private readonly classicTileWalker = new ClassicTileWalker();
  private readonly classicTiles: boolean;
  private classicAutoFollow = true;
  private battleClock = 0.25;
  private classicMode = false;
  private sim = new OfflineSimulation(842136);
  private world = new WorldRenderer(842136);
  private multiplayer: MultiplayerClient | null = null;
  private interior: InteriorRoom | null = null;
  private networkClock = 0;
  private pendingAttack = false;
  private offlineSnapshot: OfflineSave | null = null;
  private saveClock = 0;
  private accumulator = 0;
  private clock = 0;
  constructor(private readonly scene: CanvasScene, private readonly hud: GameUi, multiplayerUrl: string) {
    const saved = loadLocalSave(),
      params = new URLSearchParams(location.search);
    this.classicMode = params.get("modo") === "classico";
    // Deliberately opt-in: compare 32px steps against the validated
    // continuous classic prototype before changing its default behavior.
    this.classicTiles = this.classicMode && params.get("passos") === "1";
    this.hud.setClassicMode(this.classicMode);
    this.hud.setClassicTileMode(this.classicTiles);
    this.hud.onStopCombat(() => {
      this.classicCombat.cancel();
      this.classicPursuit.reset();
      this.hud.setCombatTarget(null);
      this.hud.setBattleCreatures(this.hudBattleRows(), null);
    });
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
    if (url && params.get("modo") !== "solo" && !this.classicMode) {
      this.multiplayer = new MultiplayerClient(
        url,
        params.get("room") ?? "origins",
        (serverSeed) => this.setOnlineWorld(serverSeed),
        (self) => this.applySnapshot(self),
        (status) => this.updateConnectionStatus(status),
      );
    } else this.hud.setStatus(this.classicMode ? "Offline · combate clássico experimental" : "Offline · aventura local");
    window.addEventListener("pagehide", () => this.save(), { signal: this.lifecycle.signal });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.save();
        this.input.clear();
        this.navigator.cancel();
        this.multiplayer?.sendInput(0, 0, false);
      }
      this.accumulator = 0;
    }, { signal: this.lifecycle.signal });
    this.hud.onNewWorld(() => this.newWorld());
    this.hud.onTalk(() => this.talkToNpc());
    this.hud.onPotionUse(() => {
      if (this.multiplayer?.connected) return "A bolsa está disponível apenas no modo solo.";
      if (!this.sim.inventory.usePotion(this.sim.player))
        return this.sim.player.hp >= this.sim.player.maxHp
          ? "Sua vida já está completa."
          : "Você não possui poções de cura.";
      this.save();
      this.hud.update(this.sim.player, aelaQuestProgress(this.sim.kills));
      this.hud.updateInventory(this.sim.inventory, false);
      return "Poção utilizada! Vida restaurada em até 35 pontos.";
    });
    this.hud.updateInventory(this.sim.inventory, false);
  }
  /** Battle entries are derived from the same camera/viewport as the canvas. */
  private hudBattleRows() {
    return visibleBattleCreatures(
      this.sim.slimes.values(), this.sim.player, this.scene.battleViewport(this.camera),
    );
  }
  private selectBattleTarget(id: string): void {
    if (!this.classicMode || this.interior || this.hud.menuOpen ||
        this.multiplayer?.connected || !this.hudBattleRows().some(row => row.id === id) ||
        !this.classicCombat.select(id, this.sim.slimes)) return;
    this.classicAutoFollow = true;
    this.classicPursuit.reset();
    this.navigator.cancel();
    this.hud.setBattleCreatures(this.hudBattleRows(), id);
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
    this.navigator.cancel();
    this.classicCombat.reset();
    this.classicPursuit.reset();
    this.classicTileWalker.reset();
    this.classicAutoFollow = true;
    this.battleClock = 0.25;
    this.hud.setBattleCreatures([], null);
    this.hud.setCombatTarget(null);
    this.interior = null;
    this.world.clear();
    this.world = new WorldRenderer(seed);
    this.sim = new OfflineSimulation(seed, saved);
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
    }
  }
  private setOnlineWorld(seed: number): void {
    if (!this.offlineSnapshot) this.offlineSnapshot = this.sim.snapshot();
    this.save();
    this.networkClock = 0;
    this.pendingAttack = false;
    this.replaceWorld(seed);
    this.hud.setOnline(true);
  }
  private applySnapshot(self: HeroState): void {
    const player = this.sim.player,
      distance = Math.hypot(self.x - player.x, self.y - player.y);
    // A correção autoritativa pode invalidar uma rota local iniciada por toque.
    if (distance > 100) this.navigator.cancel();
    const factor = distance > 100 ? 1 : 0.35;
    player.x += (self.x - player.x) * factor;
    player.y += (self.y - player.y) * factor;
    player.hp = self.hp;
    this.sim.kills = self.kills;
    player.hurtTime = Math.max(player.hurtTime, self.hurtTime ?? 0);
    if (Math.hypot(player.vx, player.vy) < 5) {
      player.faceX = self.faceX;
      player.faceY = self.faceY;
    }
    player.attackTime = Math.max(player.attackTime, self.attackTime);
    this.hud.setPlayerCount(this.multiplayer?.players.length ?? 1, true);
  }
  private talkToNpc(): void {
    if (this.hud.menuOpen) return;
    this.navigator.cancel();
    if (this.interior) {
      this.leaveInterior();
      return;
    }
    const npc = nearestNpc(this.sim.player.x, this.sim.player.y);
    if (!npc) return;
    this.input.clear();
    this.multiplayer?.sendInput(0, 0, false);
    if (npc.kind === "door" && BUILDINGS.some(b => b.id === npc.id)) {
      this.classicCombat.cancel();
      this.classicPursuit.reset();
      this.hud.setCombatTarget(null);
      this.hud.setBattleCreatures([], null);
      this.classicTileWalker.reset();
      this.interior = new InteriorRoom(npc.id);
      this.accumulator = 0;
      this.pendingAttack = false;
    } else {
      const rewarded = npc.id === "aela" && !this.multiplayer?.connected &&
        this.sim.inventory.claimAelaReward(this.sim.kills);
      if (rewarded) this.save();
      const lines = npcDialogue(npc, this.sim.kills);
      this.hud.showNpcDialogue(npc.name, npc.role, rewarded
        ? [...lines, `Recompensa de Aela: ${QUEST_REWARD_POTIONS} poções de cura guardadas na sua bolsa!`]
        : lines);
    }
  }
  private leaveInterior(): void {
    this.classicTileWalker.reset();
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
  private save(): void {
    // The temporary online world must never overwrite the player's solo save.
    // Persist its last solo checkpoint even when leaving an active online room.
    const solo = this.offlineSnapshot ?? (this.multiplayer?.connected ? null : this.sim.snapshot());
    if (solo) saveLocal(solo);
  }
  /** Called exclusively by the Phaser Scene; there is no second animation loop. */
  update(deltaSeconds: number): void {
    const dt = Math.max(0, Math.min(0.1, deltaSeconds));
    this.clock += dt;
    this.battleClock += dt;
    const online = this.multiplayer?.connected === true;
    if (this.input.consumeTalk() && !this.hud.menuOpen) this.talkToNpc();
    const paused = this.hud.menuOpen || document.hidden;
    if (paused) this.input.clear();
    const still = { x: 0, y: 0 };
    const manual = paused ? still : this.input.movement();
    const attack = !paused && this.input.consumeAttack();
    const stopTarget = this.classicMode && this.input.consumeCancelTarget();
    if (stopTarget) {
      this.classicCombat.cancel();
      this.classicPursuit.reset();
    }
    if (this.classicMode && attack && !paused && !stopTarget && !this.interior) {
      if (!this.classicCombat.targetId)
        this.classicCombat.selectNearest(this.sim.player, this.sim.slimes.values());
      if (this.classicCombat.targetId) {
        this.classicAutoFollow = true;
        this.navigator.cancel();
      }
    }
    const manualActive = Math.hypot(manual.x, manual.y) > 0.02;
    if (paused || manualActive || (!this.classicMode && attack)) this.navigator.cancel();
    if (this.classicMode && manualActive) this.classicPursuit.suspend();
    const tap = this.input.consumeTap();
    const walkByTiles = this.classicTiles && !this.interior;
    const committedStep = walkByTiles ? this.classicTileWalker.destination : null;
    // O servidor recebe somente vetores de movimento e segue autoritativo no multiplayer.
    if (tap && !paused && !manualActive && !attack) {
      const destination = this.interior
        ? this.scene.interiorPoint(tap)
        : this.scene.worldPoint(tap, this.camera);
      const player = this.interior?.player ?? this.sim.player;
      const collision = this.interior?.collision ?? this.sim.collision;
      if (destination && this.classicMode && !this.interior &&
          this.classicCombat.selectAt(destination, this.sim.slimes.values())) {
        this.classicAutoFollow = true;
        this.classicPursuit.reset();
        this.navigator.cancel();
      } else if (destination) {
        // An explicit walk command overrides automatic chasing until the
        // next creature selection; the attack target itself is preserved.
        if (this.classicMode) {
          this.classicAutoFollow = false;
          this.classicPursuit.reset();
        }
        this.navigator.go(committedStep ?? player,
          walkByTiles ? this.tileCenter(destination) : destination, collision, walkByTiles);
      }
    }
    const controlled = this.interior?.player ?? this.sim.player;
    const tileRoute = walkByTiles && this.navigator.target !== null;
    const movement = paused ? still : manualActive ? manual : tileRoute ? still :
      this.navigator.target ? this.navigator.direction(controlled, dt) :
      this.classicMode && this.classicAutoFollow && !this.interior ?
        this.classicPursuit.direction(dt, this.sim.player,
          this.classicCombat.targetId, this.sim.slimes, this.sim.collision, this.classicTiles) :
        still;
    this.pendingAttack ||= !this.classicMode && attack;
    if (this.interior) {
      const room = this.interior;
      this.pendingAttack = false; // combate indisponível em locais seguros
      this.accumulator = 0;
      if (!paused) room.update(dt, movement);
      if (room.reachedExit) this.leaveInterior();
      if (this.interior) {
        if (online && this.multiplayer) {
          this.networkClock += dt;
          if (this.networkClock >= 0.05) {
            this.networkClock %= 0.05;
            this.multiplayer.sendInput(0, 0, false);
          }
          this.multiplayer.interpolate(dt);
        } else {
          this.saveClock += dt;
          if (this.saveClock > 12) { this.saveClock = 0; this.save(); }
        }
        this.hud.update(this.sim.player, aelaQuestProgress(this.sim.kills));
        this.hud.updateInventory(this.sim.inventory, online);
        this.hud.setInterior(room.building.name);
        this.scene.renderInterior(room, this.navigator.target, this.clock);
        return;
      }
    }
    if (!paused || online) {
      this.accumulator += dt;
      while (this.accumulator >= 1 / 60) {
        this.accumulator -= 1 / 60;
        if (online) {
          this.sim.player.update(1 / 60, movement, this.sim.collision);
          if (this.pendingAttack) this.sim.player.startAttack();
        } else {
          const before = this.sim.player;
          const classicStrike = this.classicMode &&
            this.classicCombat.tick(1 / 60, this.sim.player, this.sim.slimes, this.sim.collision);
          // A rendered frame can advance multiple simulation ticks. Pick the
          // next tile only when the previous step has reached its center.
          const stepDirection = tileRoute && this.classicTileWalker.destination === null
            ? this.navigator.direction(this.sim.player, 1 / 60) : movement;
          const changed = this.sim.update(1 / 60, stepDirection,
            classicStrike || this.pendingAttack,
            this.classicMode ? this.classicCombat.strikeTargetId : undefined,
            this.classicTiles ? this.classicTileWalker : undefined);
          // Interrompe a rota se o herói levar dano ou reaparecer na clareira.
          if (this.sim.player !== before) {
            this.navigator.cancel();
            this.classicCombat.reset();
            this.classicPursuit.reset();
            this.classicTileWalker.reset();
          } else if (this.sim.player.hurtTime > 0) {
            this.navigator.cancel();
          }
          this.pendingAttack = false;
          if (changed) this.save();
        }
      }
    } else {
      this.accumulator = 0;
      this.pendingAttack = false;
    }
    if (online && this.multiplayer) {
      this.networkClock += dt;
      if (this.networkClock >= 0.05) {
        this.networkClock %= 0.05;
        this.multiplayer.sendInput(movement.x, movement.y, this.pendingAttack);
        this.pendingAttack = false;
      }
      this.multiplayer.interpolate(dt);
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
    if (this.classicMode && this.battleClock >= 0.2) {
      this.battleClock = 0;
      this.hud.setBattleCreatures(
        this.interior || online ? [] : this.hudBattleRows(),
        this.interior || online ? null : this.classicCombat.targetId,
      );
    }
    this.hud.update(this.sim.player, aelaQuestProgress(this.sim.kills));
    const focusedLabel = this.classicMode ? this.classicCombat.label(this.sim.slimes) : null;
    this.hud.setCombatTarget(focusedLabel && this.classicPursuit.destination
      ? focusedLabel + " · seguindo" : focusedLabel);
    this.hud.updateInventory(this.sim.inventory, online);
    this.hud.setNearbyNpc(nearestNpc(this.sim.player.x, this.sim.player.y));
    this.scene.render(
      this.world,
      this.camera,
      this.sim.player,
      mobs,
      online && this.multiplayer ? this.multiplayer.players : [],
      online ? (this.multiplayer?.id ?? null) : null,
      this.clock,
      this.effects,
      this.navigator.target,
      online ? [] : [...this.sim.drops.values()],
      this.classicMode ? this.classicCombat.targetId : null,
    );
  }
  destroy(): void {
    this.save();
    this.lifecycle.abort();
    this.input.destroy();
    this.multiplayer?.disconnect();
    this.navigator.cancel();
    this.classicPursuit.reset();
    this.classicTileWalker.reset();
    this.hud.setBattleCreatures([], null);
    this.world.clear();
    this.effects.reset();
  }
}
