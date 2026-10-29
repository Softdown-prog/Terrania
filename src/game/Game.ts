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
import { Hud, type Preferences } from "../ui/Hud.ts";
import { nearestNpc } from "../world/npcs.ts";

/** Coordinates adapters. Shared simulations own movement, collision and combat. */
export class Game {
  private readonly input = new Input();
  private readonly scene: CanvasScene;
  private readonly hud = new Hud();
  private readonly camera = new Camera();
  private readonly effects = new Effects();
  private sim = new OfflineSimulation(842136);
  private world = new WorldRenderer(842136);
  private multiplayer: MultiplayerClient | null = null;
  private networkClock = 0;
  private pendingAttack = false;
  private offlineSnapshot: OfflineSave | null = null;
  private lastTime = 0;
  private saveClock = 0;
  private accumulator = 0;
  private clock = 0;
  constructor(canvas: HTMLCanvasElement) {
    this.scene = new CanvasScene(canvas);
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
    const url = (
      import.meta as ImportMeta & { env?: { VITE_MULTIPLAYER_URL?: string } }
    ).env?.VITE_MULTIPLAYER_URL;
    if (url && params.get("modo") !== "solo") {
      this.multiplayer = new MultiplayerClient(
        url,
        params.get("room") ?? "origins",
        (serverSeed) => this.setOnlineWorld(serverSeed),
        (self) => this.applySnapshot(self),
        (status) => this.updateConnectionStatus(status),
      );
    } else this.hud.setStatus("Offline · aventura local");
    window.addEventListener("resize", () => this.scene.resize());
    window.addEventListener("pagehide", () => this.save());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.save();
        this.input.clear();
        this.multiplayer?.sendInput(0, 0, false);
      }
      this.lastTime = 0;
      this.accumulator = 0;
    });
    this.hud.onNewWorld(() => this.newWorld());
    this.hud.onTalk(() => this.talkToNpc());
    requestAnimationFrame((t) => this.frame(t));
  }
  private configure(p: Preferences): void {
    this.camera.setZoom(p.zoom);
    this.camera.reducedMotion = !p.cameraMotion;
    this.effects.enabled = p.effects;
  }
  private replaceWorld(seed: number, saved?: OfflineSave): void {
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
    const npc = nearestNpc(this.sim.player.x, this.sim.player.y);
    if (!npc) return;
    this.input.clear();
    this.multiplayer?.sendInput(0, 0, false);
    this.hud.showNpcDialogue(npc, this.sim.kills);
  }
  private newWorld(): void {
    if (this.multiplayer?.connected) return;
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    this.replaceWorld(values[0]);
    const url = new URL(location.href);
    url.searchParams.set("seed", String(values[0]));
    history.replaceState(null, "", url);
    this.save();
  }
  private save(): void {
    if (this.multiplayer?.connected || this.offlineSnapshot) return;
    saveLocal(this.sim.snapshot());
  }
  private frame(time: number): void {
    const dt =
      this.lastTime === 0
        ? 0
        : Math.max(0, Math.min(0.1, (time - this.lastTime) / 1000));
    this.lastTime = time;
    this.clock += dt;
    const online = this.multiplayer?.connected === true;
    if (this.input.consumeTalk() && !this.hud.menuOpen) this.talkToNpc();
    const paused = this.hud.menuOpen || document.hidden;
    if (paused) this.input.clear();
    const movement = paused ? { x: 0, y: 0 } : this.input.movement();
    const attack = !paused && this.input.consumeAttack();
    this.pendingAttack ||= attack;
    if (!paused || online) {
      this.accumulator += dt;
      while (this.accumulator >= 1 / 60) {
        this.accumulator -= 1 / 60;
        if (online) {
          this.sim.player.update(1 / 60, movement, this.sim.collision);
          if (this.pendingAttack) this.sim.player.startAttack();
        } else {
          const changed = this.sim.update(1 / 60, movement, this.pendingAttack);
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
    );
    requestAnimationFrame((next) => this.frame(next));
  }
}
