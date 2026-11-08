import type { Player } from '../actors/Player.ts';
import type { BattleViewport } from '../engine/ClassicBattleList.ts';
import type { Slime } from '../actors/Slime.ts';
import type { HeroState, MobState } from '../shared/protocol.ts';
import { renderHero, renderSlime, type HeroVisual } from '../render/actors.ts';
import { renderScenery } from '../render/scenery.ts';
import { NPCS, NPC_TALK_RANGE } from '../world/npcs.ts';
import { renderNpc } from '../render/npcs.ts';
import { WorldRenderer } from '../render/WorldRenderer.ts';
import { drawInterior } from '../render/interior.ts';
import { ROOM_WIDTH, ROOM_HEIGHT, type InteriorRoom } from '../engine/InteriorRoom.ts';
import type { Effects } from '../render/Effects.ts';
import type { Camera } from '../render/Camera.ts';
import type { Point } from '../engine/TapNavigator.ts';
import { screenToWorld, screenToInterior } from '../input/tap.ts';
import { clamp01, rgba, softShadow } from '../render/draw.ts';

import type { LootDrop } from '../engine/loot.ts';

/** Cristal de gel procedural, independente de sprite ou imagem externa. */
function renderGel(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  const bob = Math.sin(time * 2.4 + x * 0.02) * 2;
  ctx.save();
  ctx.translate(x, y);
  softShadow(ctx, 0, 3, 9 - bob * 0.4, 3, 0.35);
  // halo pulsante para o item ser notado de longe
  const pulse = 0.5 + 0.5 * Math.sin(time * 3 + x * 0.03);
  const halo = ctx.createRadialGradient(0, -7 + bob, 1, 0, -7 + bob, 17);
  halo.addColorStop(0, rgba('#8cf5c8', 0.3 + pulse * 0.2)); halo.addColorStop(1, rgba('#8cf5c8', 0));
  ctx.fillStyle = halo; ctx.fillRect(-18, -26 + bob, 36, 36);
  ctx.translate(0, -7 + bob);
  ctx.rotate(Math.sin(time * 1.6 + x) * 0.08);
  const body = ctx.createLinearGradient(-8, -12, 8, 7);
  body.addColorStop(0, '#9cf0cc'); body.addColorStop(0.55, '#4cc79d'); body.addColorStop(1, '#2a8b78');
  ctx.fillStyle = body;
  ctx.strokeStyle = '#d1fce8';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(8, -2);
  ctx.lineTo(6, 7);
  ctx.lineTo(-6, 7);
  ctx.lineTo(-8, -2);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.28)';
  ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, 7); ctx.lineTo(-6, 7); ctx.lineTo(-8, -2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e6fff7';
  ctx.fillRect(-4, -6, 3, 5);
  // brilho cruzado que passa periodicamente
  const glint = Math.max(0, Math.sin(time * 2.2 + x * 0.05) - 0.8) * 5;
  if (glint > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-glint * 2, -0.4, glint * 4, 0.8); ctx.fillRect(-0.4, -glint * 2, 0.8, glint * 4);
  }
  ctx.restore();
}

/** Shared by the game and honest, static world previews on the website. */
export function drawWorldView(ctx: CanvasRenderingContext2D, world: WorldRenderer,
  cameraX: number, cameraY: number, width: number, height: number,
  player: HeroVisual & { x: number; y: number }, mobs: ReadonlyArray<Slime | MobState>,
  remotePlayers: ReadonlyArray<HeroState> = [], selfId: string | null = null, time = 0, animated = false,
  drops: ReadonlyArray<LootDrop> = [], effects?: Effects): void {
  ctx.fillStyle = '#506f50'; ctx.fillRect(0, 0, width, height);
  world.render(ctx, cameraX, cameraY, width, height, time, animated);
  const left = cameraX - width / 2, top = cameraY - height / 2;
  effects?.renderGround(ctx, left, top);
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
        Math.hypot(player.x - npc.x, player.y - npc.y) <= NPC_TALK_RANGE, time,
        player.x - npc.x, player.y - npc.y - 20) });
  }
  for (const mob of mobs) if (Math.abs(mob.x - cameraX) < width / 2 + 30 && Math.abs(mob.y - cameraY) < height / 2 + 40) {
    actors.push({ y: mob.y, draw: () => {
      const dx = player.x - mob.x, dy = player.y - 10 - mob.y;
      renderSlime(ctx, mob, mob.x - left, mob.y - top, {
        time, lookX: dx, lookY: dy,
        near: clamp01((84 - Math.hypot(dx, dy)) / 56),
        bite: effects?.biteAmount(mob.id) ?? 0,
      });
    } });
  }
  for (const drop of drops) {
    if (Math.abs(drop.x - cameraX) > width / 2 + 12 ||
        Math.abs(drop.y - cameraY) > height / 2 + 18) continue;
    actors.push({ y: drop.y, draw: () =>
      renderGel(ctx, drop.x - left, drop.y - top, time) });
  }
  for (const remote of remotePlayers) {
    if (remote.id === selfId || Math.abs(remote.x - cameraX) > width / 2 + 40 || Math.abs(remote.y - cameraY) > height / 2 + 50) continue;
    actors.push({ y: remote.y, draw: () => {
      renderHero(ctx, remote, remote.x - left, remote.y - top, time);
      ctx.textAlign = 'center'; ctx.font = '600 9px system-ui'; ctx.fillStyle = '#fff1cb'; ctx.strokeStyle = '#15352c'; ctx.lineWidth = 3;
      ctx.strokeText(remote.name, remote.x - left, remote.y - top - 50); ctx.fillText(remote.name, remote.x - left, remote.y - top - 50);
    } });
  }
  actors.push({ y: player.y, draw: () => renderHero(ctx, player, player.x - left, player.y - top, time) });
  actors.sort((a, b) => a.y - b.y);
  for (const actor of actors) actor.draw();
}
/** Marca procedural leve: ondas concêntricas que convergem no destino do toque. */
function drawTarget(ctx: CanvasRenderingContext2D, p: Point, time: number): void {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(1, 0.62);
  for (let i = 0; i < 2; i++) {
    const k = (time * 0.9 + i * 0.5) % 1;
    ctx.strokeStyle = rgba('#e7c7ff', (1 - k) * 0.8);
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0, 0, 16 - k * 9, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.fillStyle = '#b986ff44';
  ctx.beginPath(); ctx.arc(0, 0, 8 + Math.sin(time * 5) * 1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#e7c7ff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = '#f4e6ff';
  ctx.beginPath(); ctx.moveTo(0, -3 + Math.sin(time * 5) * 0.8); ctx.lineTo(3, 0); ctx.lineTo(0, 3); ctx.lineTo(-3, 0); ctx.closePath(); ctx.fill();
  ctx.restore();
}

/** Anel dourado giratório aos pés do alvo e seta que flutua acima dele. */
function drawCombatTarget(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  ctx.save();
  ctx.translate(x, y + 2);
  ctx.save();
  ctx.scale(1, 0.4);
  ctx.rotate(time * 1.3);
  ctx.strokeStyle = rgba('#f2d388', 0.95);
  ctx.lineWidth = 2.4;
  ctx.setLineDash([7, 5]);
  ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = rgba('#fff3c8', 0.35);
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  const bob = Math.sin(time * 6) * 1.6;
  ctx.translate(0, -40 + bob);
  ctx.fillStyle = '#3a2d12'; ctx.strokeStyle = '#3a2d12'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-5, -4); ctx.lineTo(5, -4); ctx.lineTo(0, 3); ctx.closePath(); ctx.stroke();
  ctx.fillStyle = '#f2d388';
  ctx.fill();
  ctx.restore();
}

/** Partículas flutuantes (pólen/vaga-lumes) em espaço de tela; sem estado nem alocação. */
function drawAmbient(ctx: CanvasRenderingContext2D, w: number, h: number, time: number,
  camX: number, camY: number, zoom: number): void {
  const wrap = (v: number, m: number): number => ((v % m) + m) % m;
  for (let i = 0; i < 18; i++) {
    const par = (0.3 + (i % 4) * 0.18) * zoom;
    const x = wrap(i * 137.508 + time * (5 + (i % 5) * 2.4) - camX * par + Math.sin(time * 0.7 + i) * 9, w + 40) - 20;
    const y = wrap(i * 71.31 - time * (4 + (i % 3) * 2) - camY * par + Math.cos(time * 0.9 + i * 2) * 7, h + 40) - 20;
    const tw = 0.5 + 0.5 * Math.sin(time * 1.9 + i * 2.7);
    const r = 0.8 + (i % 3) * 0.55;
    ctx.fillStyle = rgba(i % 4 === 0 ? '#c9f7a8' : '#fff1b0', 0.22 + tw * 0.42);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    if (i % 3 === 0) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
      g.addColorStop(0, rgba('#fff1b0', 0.16 * tw)); g.addColorStop(1, rgba('#fff1b0', 0));
      ctx.fillStyle = g; ctx.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);
    }
  }
}
/** Canvas and sizing only; gameplay stays in the simulations. */
export class CanvasScene {
  private readonly ctx: CanvasRenderingContext2D;
  private width = 1; private height = 1; private dpr = 1;
  private readonly canvas: HTMLCanvasElement;
  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Seu navegador não disponibilizou Canvas 2D.');
    this.ctx = ctx; this.resize(width, height);
  }
  resize(viewWidth: number, viewHeight: number): void {
    // Chrome Android altera a viewport visível quando as barras e a orientação mudam.
    // A Scene Phaser fornece as dimensões CSS do elemento, evitando distorção do toque.
    const width = Math.max(1, Math.round(viewWidth));
    const height = Math.max(1, Math.round(viewHeight));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (width === this.width && height === this.height && dpr === this.dpr) return;
    this.width = width; this.height = height; this.dpr = dpr;
    this.canvas.width = Math.ceil(width * dpr);
    this.canvas.height = Math.ceil(height * dpr);
  }
  /** Same CSS viewport and camera projection used for rendering and taps. */
  battleViewport(camera: Camera): BattleViewport {
    const zoom = Math.max(0.25, camera.zoom);
    return {
      centerX: camera.renderX, centerY: camera.renderY,
      halfWidth: this.width / (2 * zoom), halfHeight: this.height / (2 * zoom),
    };
  }
  worldPoint(local: Point, camera: Camera): Point | null {
    return screenToWorld(local, this.width, this.height,
      { x: camera.renderX, y: camera.renderY }, camera.zoom);
  }
  interiorPoint(local: Point): Point | null {
    return screenToInterior(local, this.width, this.height);
  }
  renderInterior(room: InteriorRoom, destination: Point | null = null, time = 0): void {
    const scale = Math.min(1.7, this.width / (ROOM_WIDTH + 70), this.height / (ROOM_HEIGHT + 130));
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.fillStyle = '#102822';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.setTransform(this.dpr * scale, 0, 0, this.dpr * scale,
      this.dpr * (this.width - ROOM_WIDTH * scale) / 2,
      this.dpr * (this.height - ROOM_HEIGHT * scale) / 2);
    drawInterior(this.ctx, room, time);
    if (destination) drawTarget(this.ctx, destination, time);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }
  render(world: WorldRenderer, camera: Camera, player: Player, mobs: ReadonlyArray<Slime | MobState>,
    remotePlayers: ReadonlyArray<HeroState>, selfId: string | null, time: number, effects: Effects,
    destination: Point | null = null, drops: ReadonlyArray<LootDrop> = [],
    combatTargetId: string | null = null): void {
    const scale = camera.zoom, width = this.width / scale, height = this.height / scale;
    this.ctx.setTransform(this.dpr * scale, 0, 0, this.dpr * scale, 0, 0);
    drawWorldView(this.ctx, world, camera.renderX, camera.renderY, width, height, player, mobs, remotePlayers, selfId, time, effects.enabled, drops, effects);
    // Original Terrania visual: um anel dourado procedural, nunca arte copiada.
    if (combatTargetId) {
      const target = mobs.find(mob => mob.id === combatTargetId);
      if (target) {
        const left = camera.renderX - width / 2;
        const top = camera.renderY - height / 2;
        drawCombatTarget(this.ctx, target.x - left, target.y - top, time);
      }
    }
    effects.render(this.ctx, camera.renderX - width / 2, camera.renderY - height / 2);
    if (destination) drawTarget(this.ctx, { x: destination.x - (camera.renderX - width / 2),
      y: destination.y - (camera.renderY - height / 2) }, time);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (effects.enabled) drawAmbient(this.ctx, this.width, this.height, time, camera.renderX, camera.renderY, scale);
    // Gradação de cor: luz quente vinda do alto-esquerdo e sombra azulada no canto oposto.
    const grade = this.ctx.createLinearGradient(0, 0, this.width, this.height);
    grade.addColorStop(0, '#ffeeb81c'); grade.addColorStop(0.5, '#ffeeb800'); grade.addColorStop(1, '#0a284a22');
    this.ctx.fillStyle = grade; this.ctx.fillRect(0, 0, this.width, this.height);
    const vignette = this.ctx.createRadialGradient(this.width / 2, this.height / 2, this.height * .25, this.width / 2, this.height / 2, Math.max(this.width, this.height) * .7);
    vignette.addColorStop(0, '#102f2400'); vignette.addColorStop(1, '#071e2866');
    this.ctx.fillStyle = vignette; this.ctx.fillRect(0, 0, this.width, this.height);
    if (player.hurtTime > 0 && !camera.reducedMotion) {
      this.ctx.fillStyle = 'rgba(183,77,43,' + player.hurtTime * .16 + ')'; this.ctx.fillRect(0, 0, this.width, this.height);
    }
  }
}
