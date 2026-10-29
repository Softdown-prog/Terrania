import { Player } from '../actors/Player.ts';
import { Slime, slimeSpawns } from '../actors/Slime.ts';
import { SeedCollision } from '../world/collision.ts';
import { CHUNK_PIXELS, chunkOf } from '../world/terrain.ts';

/** Dados de gameplay serializáveis, independentes do navegador. */
export interface OfflineSave {
  seed: number; x: number; y: number; hp: number; kills: number; defeated: string[];
}

/** Motor puro: nenhuma dependência de Canvas, DOM, UI, rede ou localStorage. */
export class OfflineSimulation {
  player = new Player();
  readonly slimes = new Map<string, Slime>();
  readonly defeated = new Set<string>();
  readonly collision: SeedCollision;
  readonly seed: number;
  kills = 0;

  constructor(seed: number, saved?: OfflineSave) {
    this.seed = seed;
    this.collision = new SeedCollision(seed);
    if (saved && saved.seed === seed) {
      this.player.x = saved.x; this.player.y = saved.y; this.player.hp = saved.hp;
      this.kills = saved.kills;
      for (const id of saved.defeated) this.defeated.add(id);
    }
  }

  private spawnNearby(): void {
    const x0 = chunkOf(this.player.x), y0 = chunkOf(this.player.y);
    for (let cy = y0 - 2; cy <= y0 + 2; cy++) for (let cx = x0 - 2; cx <= x0 + 2; cx++) {
      for (const slime of slimeSpawns(cx, cy, this.seed)) {
        if (!this.defeated.has(slime.id) && !this.slimes.has(slime.id)) this.slimes.set(slime.id, slime);
      }
    }
  }
  /** Retorna true se o progresso mudou e merece salvar imediatamente. */
  update(dt: number, direction: { x: number; y: number }, attack: boolean): boolean {
    this.player.update(dt, direction, this.collision);
    this.spawnNearby();
    for (const [id, slime] of this.slimes) {
      const distance = Math.hypot(slime.x - this.player.x, slime.y - this.player.y);
      if (distance > CHUNK_PIXELS * 3) { this.slimes.delete(id); continue; }
      if (distance < CHUNK_PIXELS * 2) slime.update(dt, this.player, this.collision);
    }
    let changed = false;
    if (attack && this.player.startAttack()) {
      for (const [id, slime] of this.slimes) {
        const dx = slime.x - this.player.x, dy = slime.y - this.player.y;
        const dist = Math.hypot(dx, dy);
        const facing = (dx * this.player.faceX + dy * this.player.faceY) / Math.max(1, dist);
        if (dist < 49 && facing > -0.25) {
          slime.hp--;
          if (slime.hp <= 0) {
            this.slimes.delete(id); this.defeated.add(id); this.kills++; changed = true;
          }
        }
      }
    }
    if (this.player.hp <= 0) { this.player = new Player(); changed = true; }
    return changed;
  }
  snapshot(): OfflineSave {
    return { seed: this.seed, x: this.player.x, y: this.player.y,
      hp: this.player.hp, kills: this.kills, defeated: [...this.defeated].slice(-2000) };
  }
}
