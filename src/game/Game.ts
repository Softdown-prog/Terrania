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
import { nearestNpc } from "../world/npcs.ts";
import { InteriorRoom } from "../engine/InteriorRoom.ts";
import { BUILDINGS } from "../world/village.ts";
import { TapNavigator } from "../engine/TapNavigator.ts";

/** Coordinates adapters. Shared simulations own movement, collision and combat. */
export class Game {
  private readonly input = new Input();
  private readonly lifecycle = new AbortController();
  private readonly camera = new Camera();
  private readonly effects = new Effects();
  private readonly navigator = new TapNavigator();
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
    if (url && params.get("modo") !== "solo") {
      this.multiplayer = new MultiplayerClient(
        url,
        params.get("room") ?? "origins",
        (serverSeed) => this.setOnlineWorld(serverSeed),
        (self) => this.applySnapshot(self),
        (status) => this.updateConnectionStatus(status),
      );
    } else this.hud.setStatus("Offline · aventura local");
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
      this.hud.update(this.sim.player, this.sim.kills);
      this.hud.updateInventory(this.sim.inventory, false);
      return "Poção utilizada! Vida restaurada em até 35 pontos.";
    });
    this.hud.updateInventory(this.sim.inventory, false);
  }
  private configure(p: Preferences): void {
    this.camera.setZoom(p.zoom);
    this.camera.reducedMotion = !p.cameraMotion;
    this.effects.enabled = p.effects;
  }
  private replaceWorld(seed: number, saved?: OfflineSave): void {
    this.navigator.cancel();
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
      this.interior = new InteriorRoom(npc.id);
      this.accumulator = 0;
      this.pendingAttack = false;
    } else {
      const rewarded = npc.id === "aela" && !this.multiplayer?.connected &&
        this.sim.inventory.claimAelaReward(this.sim.kills);
      if (rewarded) this.save();
      this.hud.showNpcDialogue(npc, this.sim.kills,
        rewarded ? "Recompensa de Aela: 2 poções de cura guardadas na sua bolsa!" : undefined);
    }
  }
  private leaveInterior(): void {
    this.navigator.cancel();
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
    const online = this.multiplayer?.connected === true;
    if (this.input.consumeTalk() && !this.hud.menuOpen) this.talkToNpc();
    const paused = this.hud.menuOpen || document.hidden;
    if (paused) this.input.clear();
    const manual = paused ? { x: 0, y: 0 } : this.input.movement();
    const attack = !paused && this.input.consumeAttack();
    const manualActive = Math.hypot(manual.x, manual.y) > 0.02;
    if (paused || manualActive || attack || (online && !this.interior))
      this.navigator.cancel();
    const tap = this.input.consumeTap();
    if (tap && !paused && !manualActive && !attack && (!online || this.interior)) {
      const destination = this.interior
        ? this.scene.interiorPoint(tap)
        : this.scene.worldPoint(tap, this.camera);
      const player = this.interior?.player ?? this.sim.player;
      const collision = this.interior?.collision ?? this.sim.collision;
      if (destination) this.navigator.go(player, destination, collision);
    }
    const controlled = this.interior?.player ?? this.sim.player;
    const movement = paused ? { x: 0, y: 0 } :
      manualActive ? manual : this.navigator.direction(controlled, dt);
    this.pendingAttack ||= attack;
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
        this.hud.update(this.sim.player, this.sim.kills);
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
          const changed = this.sim.update(1 / 60, movement, this.pendingAttack);
          // Interrompe a rota se o herói levar dano ou reaparecer na clareira.
          if (this.sim.player !== before || this.sim.player.hurtTime > 0)
            this.navigator.cancel();
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
    this.hud.update(this.sim.player, this.sim.kills);
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
    );
  }
  destroy(): void {
    this.save();
    this.lifecycle.abort();
    this.input.destroy();
    this.multiplayer?.disconnect();
    this.navigator.cancel();
    this.world.clear();
    this.effects.reset();
  }
}
