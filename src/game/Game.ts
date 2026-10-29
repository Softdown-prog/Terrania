import { Input } from '../input/Input.ts';
import { MultiplayerClient } from '../net/MultiplayerClient.ts';
import type { HeroState } from '../shared/protocol.ts';
import { WorldRenderer } from '../render/WorldRenderer.ts';
import { OfflineSimulation, type OfflineSave } from '../engine/OfflineSimulation.ts';
import { loadLocalSave, saveLocal } from '../storage/localSave.ts';
import { CanvasScene } from '../ui/CanvasScene.ts';
import { Hud } from '../ui/Hud.ts';

/** Controlador: conecta input, simulação, rede, renderizador e HUD; não implementa regras. */
export class Game {
  private readonly input = new Input();
  private readonly scene: CanvasScene;
  private readonly hud = new Hud();
  private sim = new OfflineSimulation(842136);
  private world = new WorldRenderer(842136);
  private multiplayer: MultiplayerClient | null = null;
  private networkClock = 0;
  private pendingAttack = false;
  private offlineSnapshot: OfflineSave | null = null;
  private cameraX = 16;
  private cameraY = 16;
  private lastTime = 0;
  private saveClock = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new CanvasScene(canvas);
    const saved = loadLocalSave();
    const requestedSeed = new URLSearchParams(location.search).get('seed');
    const parsed = requestedSeed !== null && /^\d+$/.test(requestedSeed) ? Number(requestedSeed) : NaN;
    const seed = Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 4294967295
      ? parsed : saved?.seed ?? 842136;
    this.replaceWorld(seed, saved && saved.seed === seed ? saved : undefined);
    const url = (import.meta as ImportMeta & { env?: { VITE_MULTIPLAYER_URL?: string } }).env?.VITE_MULTIPLAYER_URL;
    if (url) {
      const room = new URLSearchParams(location.search).get('room') ?? 'origins';
      this.multiplayer = new MultiplayerClient(url, room,
        (serverSeed) => this.setOnlineWorld(serverSeed),
        (self) => this.applySnapshot(self),
        (status) => this.updateConnectionStatus(status));
    } else this.hud.setStatus('Offline · jogo local');
    window.addEventListener('resize', () => this.scene.resize());
    window.addEventListener('pagehide', () => this.save());
    this.hud.onNewWorld(() => this.newWorld());
    requestAnimationFrame((t) => this.frame(t));
  }

  private replaceWorld(seed: number, saved?: OfflineSave): void {
    this.world.clear();
    this.world = new WorldRenderer(seed);
    this.sim = new OfflineSimulation(seed, saved);
    this.cameraX = this.sim.player.x;
    this.cameraY = this.sim.player.y;
    this.hud.setSeed(seed);
  }
  private updateConnectionStatus(status: string): void {
    this.hud.setStatus(status);
    if (status.startsWith('Offline') && this.offlineSnapshot) {
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
    const player = this.sim.player;
    const distance = Math.hypot(self.x - player.x, self.y - player.y);
    const factor = distance > 100 ? 1 : 0.45;
    player.x += (self.x - player.x) * factor;
    player.y += (self.y - player.y) * factor;
    player.hp = self.hp;
    this.sim.kills = self.kills;
    player.faceX = self.faceX; player.faceY = self.faceY;
    player.attackTime = Math.max(player.attackTime, self.attackTime);
    this.hud.setPlayerCount(this.multiplayer?.players.length ?? 1, true);
  }
  private newWorld(): void {
    if (this.multiplayer?.connected) return;
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    const seed = values[0];
    this.replaceWorld(seed);
    const url = new URL(location.href);
    url.searchParams.set('seed', String(seed));
    history.replaceState(null, '', url);
    this.save();
  }
  private save(): void {
    if (this.multiplayer?.connected || this.offlineSnapshot) return;
    saveLocal(this.sim.snapshot());
  }
  private frame(time: number): void {
    const dt = this.lastTime === 0 ? 0 : Math.min(0.05, (time - this.lastTime) / 1000);
    this.lastTime = time;
    this.update(dt);
    this.scene.render(this.world, this.cameraX, this.cameraY, this.sim.player,
      this.multiplayer?.connected ? this.multiplayer.mobs : [...this.sim.slimes.values()],
      this.multiplayer?.connected ? this.multiplayer.players : [],
      this.multiplayer?.connected ? this.multiplayer.id : null);
    requestAnimationFrame((next) => this.frame(next));
  }
  private update(dt: number): void {
    const online = this.multiplayer?.connected === true;
    const movement = this.input.movement();
    const attack = this.input.consumeAttack();
    if (online && this.multiplayer) {
      // Predição visual; dano, posição oficial e progresso continuam no servidor.
      this.sim.player.update(dt, movement, this.sim.collision);
      if (attack) { this.sim.player.startAttack(); this.pendingAttack = true; }
      this.networkClock += dt;
      if (this.networkClock >= 0.05) {
        this.networkClock = 0;
        this.multiplayer.sendInput(movement.x, movement.y, this.pendingAttack);
        this.pendingAttack = false;
      }
    } else {
      this.pendingAttack = false;
      const changed = this.sim.update(dt, movement, attack);
      this.saveClock += dt;
      if (changed || this.saveClock >= 12) { this.saveClock = 0; this.save(); }
      this.hud.setPlayerCount(1, false);
    }
    this.cameraX += (this.sim.player.x - this.cameraX) * Math.min(1, dt * 8);
    this.cameraY += (this.sim.player.y - this.cameraY) * Math.min(1, dt * 8);
    this.hud.update(this.sim.player, this.sim.kills);
  }
}
