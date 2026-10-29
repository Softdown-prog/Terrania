import type { Player } from '../actors/Player.ts';
import type { Slime } from '../actors/Slime.ts';
import type { HeroState, MobState } from '../shared/protocol.ts';
import { renderHero, renderSlime } from '../render/actors.ts';
import { WorldRenderer } from '../render/WorldRenderer.ts';

/** Adaptador exclusivo de Canvas: sem regras de combate ou persistência. */
export class CanvasScene {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly canvas: HTMLCanvasElement;
  private width = 1;
  private height = 1;
  private dpr = 1;
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Seu navegador não disponibilizou Canvas 2D.');
    this.ctx = ctx;
    this.resize();
  }
  resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(1, window.innerWidth);
    this.height = Math.max(1, window.innerHeight);
    this.canvas.width = Math.ceil(this.width * this.dpr);
    this.canvas.height = Math.ceil(this.height * this.dpr);
  }
  render(world: WorldRenderer, cameraX: number, cameraY: number, player: Player,
    mobs: ReadonlyArray<Slime | MobState>, remotePlayers: ReadonlyArray<HeroState>, selfId: string | null): void {
    const online = selfId !== null;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.fillStyle = '#315d46'; this.ctx.fillRect(0, 0, this.width, this.height);
    world.render(this.ctx, cameraX, cameraY, this.width, this.height);
    const left = cameraX - this.width / 2, top = cameraY - this.height / 2;
    const actors: Array<{ y: number; draw: () => void }> = [];
    for (const mob of mobs) {
      if (Math.abs(mob.x - cameraX) < this.width / 2 + 30 &&
          Math.abs(mob.y - cameraY) < this.height / 2 + 30) {
        actors.push({ y: mob.y, draw: () => renderSlime(this.ctx, mob, mob.x - left, mob.y - top) });
      }
    }
    if (online) {
      for (const remote of remotePlayers) {
        if (remote.id === selfId) continue;
        if (Math.abs(remote.x - cameraX) > this.width / 2 + 40 ||
            Math.abs(remote.y - cameraY) > this.height / 2 + 40) continue;
        actors.push({ y: remote.y, draw: () => {
          renderHero(this.ctx, remote, remote.x - left, remote.y - top);
          this.ctx.textAlign = 'center'; this.ctx.font = 'bold 11px system-ui';
          this.ctx.fillStyle = '#fff9da'; this.ctx.strokeStyle = '#09261e'; this.ctx.lineWidth = 3;
          this.ctx.strokeText(remote.name, remote.x - left, remote.y - top - 28);
          this.ctx.fillText(remote.name, remote.x - left, remote.y - top - 28);
        } });
      }
    }
    actors.push({ y: player.y, draw: () =>
      renderHero(this.ctx, player, player.x - left, player.y - top) });
    actors.sort((a, b) => a.y - b.y);
    for (const actor of actors) actor.draw();
  }
}
