import type { Player } from '../actors/Player.ts';
import type { Slime } from '../actors/Slime.ts';
import type { HeroState, MobState } from '../shared/protocol.ts';
import { renderHero, renderSlime, type HeroVisual } from '../render/actors.ts';
import { renderScenery } from '../render/scenery.ts';
import { NPCS, NPC_TALK_RANGE } from '../world/npcs.ts';
import { renderNpc } from '../render/npcs.ts';
import { WorldRenderer } from '../render/WorldRenderer.ts';
import type { Effects } from '../render/Effects.ts';
import type { Camera } from '../render/Camera.ts';

/** Shared by the game and honest, static world previews on the website. */
export function drawWorldView(ctx: CanvasRenderingContext2D, world: WorldRenderer,
  cameraX: number, cameraY: number, width: number, height: number,
  player: HeroVisual & { x: number; y: number }, mobs: ReadonlyArray<Slime | MobState>,
  remotePlayers: ReadonlyArray<HeroState> = [], selfId: string | null = null, time = 0, animated = false): void {
  ctx.fillStyle = '#506f50'; ctx.fillRect(0, 0, width, height);
  world.render(ctx, cameraX, cameraY, width, height, time, animated);
  const left = cameraX - width / 2, top = cameraY - height / 2;
  const actors: Array<{ y: number; draw: () => void }> = [];
  for (const prop of world.objects(cameraX, cameraY, width, height)) {
    const faded = (prop.kind === 'tree' || prop.kind === 'arch') &&
      Math.abs(player.x - prop.x) < (prop.kind === 'arch' ? 22 : 32) && player.y < prop.y && player.y > prop.y - 65;
    actors.push({ y: prop.y, draw: () => renderScenery(ctx, prop, prop.x - left, prop.y - top, time, faded) });
  }
  for (const npc of NPCS) {
    if (Math.abs(npc.x - cameraX) > width / 2 + 40 || Math.abs(npc.y - cameraY) > height / 2 + 65) continue;
    actors.push({ y: npc.y, draw: () =>
      renderNpc(ctx, npc, npc.x - left, npc.y - top,
        Math.hypot(player.x - npc.x, player.y - npc.y) <= NPC_TALK_RANGE) });
  }
  for (const mob of mobs) if (Math.abs(mob.x - cameraX) < width / 2 + 30 && Math.abs(mob.y - cameraY) < height / 2 + 40) {
    actors.push({ y: mob.y, draw: () => renderSlime(ctx, mob, mob.x - left, mob.y - top) });
  }
  for (const remote of remotePlayers) {
    if (remote.id === selfId || Math.abs(remote.x - cameraX) > width / 2 + 40 || Math.abs(remote.y - cameraY) > height / 2 + 50) continue;
    actors.push({ y: remote.y, draw: () => {
      renderHero(ctx, remote, remote.x - left, remote.y - top);
      ctx.textAlign = 'center'; ctx.font = '600 9px system-ui'; ctx.fillStyle = '#fff1cb'; ctx.strokeStyle = '#15352c'; ctx.lineWidth = 3;
      ctx.strokeText(remote.name, remote.x - left, remote.y - top - 46); ctx.fillText(remote.name, remote.x - left, remote.y - top - 46);
    } });
  }
  actors.push({ y: player.y, draw: () => renderHero(ctx, player, player.x - left, player.y - top) });
  actors.sort((a, b) => a.y - b.y);
  for (const actor of actors) actor.draw();
}
/** Canvas and sizing only; gameplay stays in the simulations. */
export class CanvasScene {
  private readonly ctx: CanvasRenderingContext2D;
  private width = 1; private height = 1; private dpr = 1;
  private readonly canvas: HTMLCanvasElement;
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Seu navegador não disponibilizou Canvas 2D.');
    this.ctx = ctx; this.resize();
  }
  resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(1, window.innerWidth); this.height = Math.max(1, window.innerHeight);
    this.canvas.width = Math.ceil(this.width * this.dpr); this.canvas.height = Math.ceil(this.height * this.dpr);
  }
  render(world: WorldRenderer, camera: Camera, player: Player, mobs: ReadonlyArray<Slime | MobState>,
    remotePlayers: ReadonlyArray<HeroState>, selfId: string | null, time: number, effects: Effects): void {
    const scale = camera.zoom, width = this.width / scale, height = this.height / scale;
    this.ctx.setTransform(this.dpr * scale, 0, 0, this.dpr * scale, 0, 0);
    drawWorldView(this.ctx, world, camera.renderX, camera.renderY, width, height, player, mobs, remotePlayers, selfId, time, effects.enabled);
    effects.render(this.ctx, camera.renderX - width / 2, camera.renderY - height / 2);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const vignette = this.ctx.createRadialGradient(this.width / 2, this.height / 2, this.height * .25, this.width / 2, this.height / 2, Math.max(this.width, this.height) * .7);
    vignette.addColorStop(0, '#102f2400'); vignette.addColorStop(1, '#071e2855');
    this.ctx.fillStyle = vignette; this.ctx.fillRect(0, 0, this.width, this.height);
    if (player.hurtTime > 0 && !camera.reducedMotion) {
      this.ctx.fillStyle = 'rgba(183,77,43,' + player.hurtTime * .16 + ')'; this.ctx.fillRect(0, 0, this.width, this.height);
    }
  }
}
