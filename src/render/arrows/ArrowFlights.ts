import type { Player } from "../../actors/Player.ts";
import { bowReach } from "../../engine/combat/ArrowCombat.ts";
import { drawArrowShot } from "./arrow.ts";
import { drawArrowHit } from "./hit.ts";

/** Velocidade da flecha, em pixels por segundo, e os limites do voo (mais lenta que a magia: dá para ver a flecha). */
export const ARROW_SPEED = 900;
export const ARROW_MIN_FLIGHT = 0.06;
export const ARROW_MAX_FLIGHT = 0.26;
export const ARROW_HIT_LIFE = 0.3;
export const ARROW_KILL_HIT_LIFE = 0.46;
export const ARROW_LABEL_LIFE = 0.8;
/** A flecha sai na altura das mãos e atinge o alvo na altura do peito, não nos pés. */
const HANDS = 14, CHEST = 12, ARM = 10;
const MAX_FLIGHTS = 12, MAX_HITS = 16, MAX_LABELS = 16;
export const ARROW_LABEL_COLOR = "#f0d9a0";

export type ArrowShooter = Pick<Player, "x" | "y" | "faceX" | "faceY" | "attackTime" | "attackBow" | "strikeDamage">;
export interface ArrowTarget { readonly id: string; readonly x: number; readonly y: number; readonly hp: number }

interface Flight { fromX: number; fromY: number; toX: number; toY: number; age: number; flight: number; damage: number; kill: boolean }
interface Hit { x: number; y: number; age: number; life: number; kill: boolean }
interface Label { x: number; y: number; text: string; age: number; big: boolean }

const finite = (v: number): boolean => Number.isFinite(v);

/**
 * O que se vê do tiro do Arqueiro (ADR 0112): a flecha que sai das mãos do herói e voa até o alvo, e o impacto (com o número do dano)
 * quando chega. É só apresentação: o dano já foi aplicado pela simulação no instante da saída; esta classe descobre a saída pela queda de
 * vida do monstro (como `SpellBolts`) e atrasa só o que se vê. Serve a superfície e a caverna, que têm o mesmo tiro.
 */
export class ArrowFlights {
  /** Com os efeitos desligados (ajuste de desempenho) só a flecha aparece; impacto e números não. */
  enabled = true;
  private flights: Flight[] = [];
  private hits: Hit[] = [];
  private labels: Label[] = [];
  private previous = new Map<string, { hp: number; x: number; y: number }>();

  reset(): void { this.flights = []; this.hits = []; this.labels = []; this.previous.clear(); }

  /** Quantas flechas estão voando (para teste e para a tela decidir se precisa desenhar). */
  get flying(): number { return this.flights.length; }
  get active(): boolean { return this.flights.length + this.hits.length + this.labels.length > 0; }

  update(dt: number, shooter: ArrowShooter, mobs: Iterable<ArrowTarget>): void {
    const shooting = shooter.attackBow !== null && shooter.attackTime > 0;
    const next = new Map<string, { hp: number; x: number; y: number }>();
    for (const mob of mobs) {
      const old = this.previous.get(mob.id);
      if (shooting && old && old.hp > mob.hp) this.launch(shooter, mob.x, mob.y, old.hp - mob.hp, false);
      next.set(mob.id, { hp: mob.hp, x: mob.x, y: mob.y });
    }
    if (shooting && shooter.attackBow) {
      const reach = bowReach(shooter.attackBow) + 8, killDamage = Math.max(1, finite(shooter.strikeDamage) ? shooter.strikeDamage : 1);
      for (const [id, old] of this.previous)
        if (!next.has(id) && old.hp <= killDamage && Math.hypot(old.x - shooter.x, old.y - shooter.y) <= reach) this.launch(shooter, old.x, old.y, old.hp, true);
    }
    this.previous = next;
    this.advance(finite(dt) && dt > 0 ? Math.min(dt, 0.1) : 0);
  }

  private launch(shooter: ArrowShooter, toX: number, toY: number, damage: number, kill: boolean): void {
    if (this.flights.length >= MAX_FLIGHTS) return;
    const fromX = shooter.x + shooter.faceX * ARM, fromY = shooter.y - HANDS, aimY = toY - CHEST;
    const flight = Math.max(ARROW_MIN_FLIGHT, Math.min(ARROW_MAX_FLIGHT, Math.hypot(toX - fromX, aimY - fromY) / ARROW_SPEED));
    this.flights.push({ fromX, fromY, toX, toY: aimY, age: 0, flight, damage, kill });
  }

  private advance(step: number): void {
    const arrived: Flight[] = [];
    for (const f of this.flights) { f.age += step; if (f.age >= f.flight) arrived.push(f); }
    this.flights = this.flights.filter(f => f.age < f.flight);
    if (this.enabled) for (const f of arrived) {
      if (this.hits.length < MAX_HITS) this.hits.push({ x: f.toX, y: f.toY, age: 0, life: f.kill ? ARROW_KILL_HIT_LIFE : ARROW_HIT_LIFE, kill: f.kill });
      this.labels.push({ x: f.toX, y: f.toY - 18, text: "−" + f.damage, age: 0, big: f.damage > 1 });
    }
    for (const hit of this.hits) hit.age += step;
    this.hits = this.hits.filter(hit => hit.age < hit.life);
    for (const label of this.labels) { label.age += step; label.y -= step * (label.age < 0.14 ? 40 : 22); }
    this.labels = this.labels.filter(label => label.age < ARROW_LABEL_LIFE).slice(-MAX_LABELS);
  }

  render(ctx: CanvasRenderingContext2D, left: number, top: number): void {
    for (const f of this.flights) {
      const t = Math.min(1, f.age / f.flight);
      ctx.save();
      ctx.translate(f.fromX + (f.toX - f.fromX) * t - left, f.fromY + (f.toY - f.fromY) * t - top);
      ctx.rotate(Math.atan2(f.toY - f.fromY, f.toX - f.fromX));
      drawArrowShot(ctx, t);
      ctx.restore();
    }
    for (const hit of this.hits) {
      ctx.save(); ctx.translate(hit.x - left, hit.y - top);
      drawArrowHit(ctx, hit.age / hit.life, hit.kill);
      ctx.restore();
    }
    ctx.textAlign = "center"; ctx.lineJoin = "round";
    for (const label of this.labels) {
      const pop = label.age < 0.14 ? 1.6 - 0.6 * (label.age / 0.14) : 1;
      ctx.save(); ctx.translate(label.x - left, label.y - top); ctx.scale(pop, pop);
      ctx.globalAlpha = Math.min(1, (ARROW_LABEL_LIFE - label.age) * 4);
      ctx.font = (label.big ? "800 13px" : "bold 10px") + " system-ui"; ctx.lineWidth = label.big ? 3 : 2.4;
      ctx.strokeStyle = "#18352e"; ctx.fillStyle = ARROW_LABEL_COLOR;
      ctx.strokeText(label.text, 0, 0); ctx.fillText(label.text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}
