import { Player } from '../actors/Player.ts';
import { Slime, slimeSpawns } from '../actors/Slime.ts';
import { Input } from '../input/Input.ts';
import { MultiplayerClient } from '../net/MultiplayerClient.ts';
import type { HeroState } from '../shared/protocol.ts';
import { renderHero, renderSlime } from '../render/actors.ts';
import { World } from '../world/World.ts';
import { CHUNK_PIXELS, chunkOf } from '../world/terrain.ts';

const SAVE_KEY = 'terrania-origins-v1';
type Save = { seed: number; x: number; y: number; hp: number; kills: number; defeated: string[] };

function getSave(): Save | null {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null');
    if (!data || typeof data !== 'object') return null;
    const save = data as Partial<Save>;
    if (typeof save.seed !== 'number' || !Number.isFinite(save.seed) || typeof save.x !== 'number' || !Number.isFinite(save.x)
      || typeof save.y !== 'number' || !Number.isFinite(save.y) || typeof save.hp !== 'number' || !Number.isFinite(save.hp)
      || !Array.isArray(save.defeated) || !save.defeated.every(id => typeof id === 'string')) return null;
    return { seed: save.seed >>> 0, x: save.x, y: save.y, hp: Math.min(100, Math.max(1, save.hp)),
      kills: Number.isFinite(save.kills) ? Math.max(0, save.kills ?? 0) : 0, defeated: save.defeated.slice(0, 2000) };
  } catch { return null; }
}

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private input = new Input();
  private world: World;
  private player = new Player();
  private slimes = new Map<string, Slime>();
  private defeated = new Set<string>();
  private multiplayer: MultiplayerClient | null = null;
  private networkClock = 0;
  private pendingAttack = false;
  private offlineSnapshot: Save | null = null;
  private multiplayerStatus = document.getElementById('multiplayerStatus')!;
  private playerCount = document.getElementById('playerCount')!;
  private kills = 0;
  private cameraX = this.player.x; private cameraY = this.player.y;
  private lastTime = 0; private saveClock = 0;
  private width = 1; private height = 1; private dpr = 1;
  private hpFill = document.getElementById('hpFill')!;
  private hpText = document.getElementById('hpText')!;
  private quest = document.getElementById('quest')!;
  private seedDisplay = document.getElementById('seed')!;
  private coords = document.getElementById('coords')!;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Seu navegador não disponibilizou Canvas 2D.');
    this.ctx = ctx;
    const saved = getSave();
    const requestedSeed = new URLSearchParams(location.search).get('seed');
    const parsed = requestedSeed !== null && /^\d+$/.test(requestedSeed) ? Number(requestedSeed) : NaN;
    const seed = Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 4294967295 ? parsed : saved?.seed ?? 842136;
    this.world = new World(seed);
    if (saved && saved.seed === seed) {
      this.player.x = saved.x; this.player.y = saved.y; this.player.hp = saved.hp;
      this.kills = saved.kills; this.defeated = new Set(saved.defeated);
      this.cameraX = saved.x; this.cameraY = saved.y;
    }
    this.seedDisplay.textContent = String(seed);
    const url = (import.meta as ImportMeta & { env?: { VITE_MULTIPLAYER_URL?: string } }).env?.VITE_MULTIPLAYER_URL;
    if (url) {
      const room = new URLSearchParams(location.search).get('room') ?? 'origins';
      this.multiplayer = new MultiplayerClient(url, room, serverSeed => this.setOnlineWorld(serverSeed),
        self => this.applySnapshot(self), status => this.updateConnectionStatus(status));
    } else this.multiplayerStatus.textContent = 'Offline · jogo local';
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('pagehide', () => this.save());
    document.getElementById('newWorld')?.addEventListener('click', () => this.newWorld());
    this.resize(); requestAnimationFrame(t => this.frame(t));
  }
  private resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(1, window.innerWidth); this.height = Math.max(1, window.innerHeight);
    this.canvas.width = Math.ceil(this.width * this.dpr);
    this.canvas.height = Math.ceil(this.height * this.dpr);
  }
  private updateConnectionStatus(status: string): void {
    this.multiplayerStatus.textContent = status;
    if (status.startsWith('Offline') && this.offlineSnapshot) this.restoreOfflineWorld();
  }
  private restoreOfflineWorld(): void {
    const original = this.offlineSnapshot;
    if (!original) return;
    this.offlineSnapshot = null;
    this.world.clear(); this.world = new World(original.seed);
    this.player = new Player();
    this.player.x = original.x; this.player.y = original.y; this.player.hp = original.hp;
    this.kills = original.kills; this.defeated = new Set(original.defeated);
    this.slimes.clear();
    this.cameraX = original.x; this.cameraY = original.y;
    this.seedDisplay.textContent = String(original.seed);
    const button = document.getElementById('newWorld') as HTMLButtonElement | null;
    if (button) { button.disabled = false; button.title = 'Gerar um novo mundo'; }
  }
  private setOnlineWorld(seed: number): void {
    if (!this.offlineSnapshot) this.offlineSnapshot = {
      seed: this.world.seed, x: this.player.x, y: this.player.y, hp: this.player.hp,
      kills: this.kills, defeated: [...this.defeated]
    };
    this.networkClock = 0; this.pendingAttack = false;
    this.world.clear(); this.world = new World(seed);
    this.player = new Player(); this.slimes.clear();
    this.cameraX = this.player.x; this.cameraY = this.player.y;
    this.seedDisplay.textContent = String(seed);
    const button = document.getElementById('newWorld') as HTMLButtonElement | null;
    if (button) { button.disabled = true; button.title = 'O mundo é determinado pelo servidor da sala'; }
  }
  private applySnapshot(self: HeroState): void {
    const distance = Math.hypot(self.x - this.player.x, self.y - this.player.y);
    const factor = distance > 100 ? 1 : .45;
    this.player.x += (self.x - this.player.x) * factor;
    this.player.y += (self.y - this.player.y) * factor;
    this.player.hp = self.hp; this.kills = self.kills;
    this.player.faceX = self.faceX; this.player.faceY = self.faceY;
    this.player.attackTime = Math.max(this.player.attackTime, self.attackTime);
    this.playerCount.textContent = (this.multiplayer?.players.length ?? 1) + ' próximos';
  }
  private newWorld(): void {
    if (this.multiplayer?.connected) return;
    const values = new Uint32Array(1); crypto.getRandomValues(values);
    this.world.clear(); this.world = new World(values[0]);
    this.player = new Player(); this.slimes.clear(); this.defeated.clear(); this.kills = 0;
    this.cameraX = this.player.x; this.cameraY = this.player.y;
    this.seedDisplay.textContent = String(values[0]);
    const url = new URL(location.href);
    url.searchParams.set('seed', String(values[0]));
    history.replaceState(null, '', url);
    this.save();
  }
  private save(): void {
    if (this.multiplayer?.connected) return;
    const data: Save = { seed: this.world.seed, x: this.player.x, y: this.player.y,
      hp: this.player.hp, kills: this.kills, defeated: Array.from(this.defeated).slice(-2000) };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* armazenamento bloqueado */ }
  }
  private frame(time: number): void {
    const dt = this.lastTime === 0 ? 0 : Math.min(.05, (time - this.lastTime) / 1000);
    this.lastTime = time;
    this.update(dt); this.render();
    requestAnimationFrame(next => this.frame(next));
  }
  private spawnVisible(): void {
    const x0 = chunkOf(this.player.x), y0 = chunkOf(this.player.y);
    for (let cy = y0 - 2; cy <= y0 + 2; cy++) for (let cx = x0 - 2; cx <= x0 + 2; cx++) {
      for (const slime of slimeSpawns(cx, cy, this.world.seed)) {
        if (!this.defeated.has(slime.id) && !this.slimes.has(slime.id)) this.slimes.set(slime.id, slime);
      }
    }
  }
  private update(dt: number): void {
    const online = this.multiplayer?.connected === true;
    const movement = this.input.movement();
    this.player.update(dt, movement, this.world);
    this.cameraX += (this.player.x - this.cameraX) * Math.min(1, dt * 8);
    this.cameraY += (this.player.y - this.cameraY) * Math.min(1, dt * 8);
    const attack = this.input.consumeAttack();
    if (online && this.multiplayer) {
      if (attack) { this.player.startAttack(); this.pendingAttack = true; }
      this.networkClock += dt;
      if (this.networkClock >= 0.05) {
        this.networkClock = 0;
        this.multiplayer.sendInput(movement.x, movement.y, this.pendingAttack);
        this.pendingAttack = false;
      }
    } else {
      this.pendingAttack = false;
      this.spawnVisible();
      for (const [id, slime] of this.slimes) {
        const distance = Math.hypot(slime.x - this.player.x, slime.y - this.player.y);
        if (distance > CHUNK_PIXELS * 3) { this.slimes.delete(id); continue; }
        if (distance < CHUNK_PIXELS * 2) slime.update(dt, this.player, this.world);
      }
      if (attack && this.player.startAttack()) {
        for (const [id, slime] of this.slimes) {
          const dx = slime.x - this.player.x, dy = slime.y - this.player.y;
          const dist = Math.hypot(dx, dy);
          const forward = (dx * this.player.faceX + dy * this.player.faceY) / Math.max(1, dist);
          if (dist < 49 && forward > -.25) {
            slime.hp--;
            if (slime.hp <= 0) {
              this.slimes.delete(id); this.defeated.add(id); this.kills++; this.save();
            }
          }
        }
      }
      if (this.player.hp <= 0) {
        this.player = new Player(); this.cameraX = this.player.x; this.cameraY = this.player.y;
        this.save();
      }
      this.saveClock += dt;
      if (this.saveClock >= 12) { this.saveClock = 0; this.save(); }
      this.playerCount.textContent = '1 jogador';
    }
    this.hpFill.style.width = this.player.hp + '%';
    this.hpText.textContent = this.player.hp + ' / ' + this.player.maxHp;
    this.quest.textContent = this.kills >= 5 ? 'Missão concluída ✓' : 'Derrote 5 slimes (' + this.kills + '/5)';
    this.coords.textContent = 'X ' + Math.floor(this.player.x / 32) + ' · Y ' + Math.floor(this.player.y / 32);
  }
  private render(): void {
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.fillStyle = '#315d46'; this.ctx.fillRect(0, 0, this.width, this.height);
    this.world.render(this.ctx, this.cameraX, this.cameraY, this.width, this.height);
    const left = this.cameraX - this.width / 2, top = this.cameraY - this.height / 2;
    const online = this.multiplayer?.connected === true;
    const mobs = online ? this.multiplayer!.mobs : Array.from(this.slimes.values());
    const actors: Array<{ y: number; draw: () => void }> = [];
    for (const mob of mobs) {
      if (Math.abs(mob.x - this.cameraX) < this.width / 2 + 30 &&
          Math.abs(mob.y - this.cameraY) < this.height / 2 + 30) {
        actors.push({ y: mob.y, draw: () => renderSlime(this.ctx, mob, mob.x - left, mob.y - top) });
      }
    }
    if (online) {
      for (const remote of this.multiplayer!.players) {
        if (remote.id === this.multiplayer!.id) continue;
        if (Math.abs(remote.x - this.cameraX) > this.width / 2 + 40 ||
            Math.abs(remote.y - this.cameraY) > this.height / 2 + 40) continue;
        actors.push({ y: remote.y, draw: () => {
          renderHero(this.ctx, remote, remote.x - left, remote.y - top);
          this.ctx.textAlign = 'center'; this.ctx.font = 'bold 11px system-ui';
          this.ctx.fillStyle = '#fff9da'; this.ctx.strokeStyle = '#09261e'; this.ctx.lineWidth = 3;
          this.ctx.strokeText(remote.name, remote.x - left, remote.y - top - 28);
          this.ctx.fillText(remote.name, remote.x - left, remote.y - top - 28);
        } });
      }
    }
    actors.push({ y: this.player.y, draw: () =>
      renderHero(this.ctx, this.player, this.player.x - left, this.player.y - top) });
    actors.sort((a, b) => a.y - b.y);
    for (const actor of actors) actor.draw();
  }
}
