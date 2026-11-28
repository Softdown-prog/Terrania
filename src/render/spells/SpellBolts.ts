import type { Player } from "../../actors/Player.ts";
import { STAVES, type StaffId } from "../../engine/character/Staves.ts";
import { spellReach } from "../../engine/combat/SpellCombat.ts";
import { staffMount, staffTip } from "../heroPose.ts";
import { drawSpellBolt } from "./bolt.ts";
import { drawSpellBurst } from "./burst.ts";
import { castPhase } from "./castPose.ts";
import { ArrowFlights } from "../arrows/ArrowFlights.ts";

/** Velocidade do projétil, em pixels por segundo, e os limites do voo (perto: quase instantâneo; longe: um instante a mais). */
export const BOLT_SPEED = 1100;
export const BOLT_MIN_FLIGHT = 0.05;
export const BOLT_MAX_FLIGHT = 0.2;
export const BURST_LIFE = 0.34;
export const KILL_BURST_LIFE = 0.52;
export const BOLT_LABEL_LIFE = 0.8;
/** O alvo é atingido na altura do peito, não nos pés. */
const CHEST = 12;
const MAX_BOLTS = 12, MAX_BURSTS = 16, MAX_LABELS = 16;

export type SpellCaster = Pick<Player, "x" | "y" | "faceX" | "faceY" | "attackTime" | "attackStaff" | "attackBow" | "attackWindup" | "strikeDamage">;
export interface SpellTarget { readonly id: string; readonly x: number; readonly y: number; readonly hp: number }

interface Bolt { staff: StaffId; fromX: number; fromY: number; toX: number; toY: number; age: number; flight: number; damage: number; kill: boolean }
interface Burst { staff: StaffId; x: number; y: number; age: number; life: number; kill: boolean }
interface Label { staff: StaffId; x: number; y: number; text: string; age: number; big: boolean }

const finite = (v: number): boolean => Number.isFinite(v);

/**
 * O que se vê da magia do Mago (ADR 0070): o projétil que sai da gema do cajado e voa até o alvo, e o estouro (com o número do dano)
 * quando chega. É só apresentação: o dano já foi aplicado pela simulação no instante da saída; esta classe descobre a saída pela queda de
 * vida do monstro (como `Effects`) e atrasa só o que se vê. Serve a superfície e a caverna, que têm a mesma magia.
 */
export class SpellBolts {
  /** As flechas do Arqueiro (ADR 0112) seguem o mesmo caminho (atualizar, desenhar, limpar) que o projétil da magia, na superfície e na caverna. */
  readonly arrows = new ArrowFlights();
  private _enabled = true;
  /** Com os efeitos desligados (ajuste de desempenho) só o projétil aparece; estouro e números não. */
  get enabled(): boolean { return this._enabled; }
  set enabled(on: boolean) { this._enabled = on; this.arrows.enabled = on; }
  private bolts: Bolt[] = [];
  private bursts: Burst[] = [];
  private labels: Label[] = [];
  private previous = new Map<string, { hp: number; x: number; y: number }>();
  private clock = 0;

  reset(): void { this.bolts = []; this.bursts = []; this.labels = []; this.previous.clear(); this.clock = 0; this.arrows.reset(); }

  /** Quantos projéteis estão voando (para teste e para a tela decidir se precisa desenhar). */
  get flying(): number { return this.bolts.length; }
  get active(): boolean { return this.bolts.length + this.bursts.length + this.labels.length > 0 || this.arrows.active; }

  update(dt: number, caster: SpellCaster, mobs: Iterable<SpellTarget>): void {
    const pool = [...mobs];
    this.arrows.update(dt, caster, pool);
    const spell = caster.attackStaff !== null && caster.attackTime > 0;
    const next = new Map<string, { hp: number; x: number; y: number }>();
    for (const mob of pool) {
      if (!finite(mob.x) || !finite(mob.y)) continue;
      const old = this.previous.get(mob.id);
      if (spell && old && old.hp > mob.hp) this.launch(caster, mob.x, mob.y, old.hp - mob.hp, false);
      next.set(mob.id, { hp: mob.hp, x: mob.x, y: mob.y });
    }
    if (spell && caster.attackStaff) {
      const reach = spellReach(caster.attackStaff) + 8, killDamage = Math.max(1, finite(caster.strikeDamage) ? caster.strikeDamage : 1);
      for (const [id, old] of this.previous)
        if (!next.has(id) && old.hp <= killDamage && Math.hypot(old.x - caster.x, old.y - caster.y) <= reach) this.launch(caster, old.x, old.y, old.hp, true);
    }
    this.previous = next;
    const step = finite(dt) && dt > 0 ? Math.min(dt, 0.1) : 0;
    this.clock += step;
    this.advance(step);
  }

  private launch(caster: SpellCaster, toX: number, toY: number, damage: number, kill: boolean): void {
    const staff = caster.attackStaff;
    if (!staff || this.bolts.length >= MAX_BOLTS) return;
    const tip = staffTip(staffMount(caster, 0, castPhase(caster.attackTime, caster.attackWindup)));
    const fromX = caster.x + tip.x, fromY = caster.y + tip.y, aimY = toY - CHEST;
    const flight = Math.max(BOLT_MIN_FLIGHT, Math.min(BOLT_MAX_FLIGHT, Math.hypot(toX - fromX, aimY - fromY) / BOLT_SPEED));
    this.bolts.push({ staff, fromX, fromY, toX, toY: aimY, age: 0, flight, damage, kill });
  }

  private advance(step: number): void {
    const arrived: Bolt[] = [];
    for (const bolt of this.bolts) { bolt.age += step; if (bolt.age >= bolt.flight) arrived.push(bolt); }
    this.bolts = this.bolts.filter(bolt => bolt.age < bolt.flight);
    if (this.enabled) for (const bolt of arrived) {
      if (this.bursts.length < MAX_BURSTS) this.bursts.push({ staff: bolt.staff, x: bolt.toX, y: bolt.toY, age: 0, life: bolt.kill ? KILL_BURST_LIFE : BURST_LIFE, kill: bolt.kill });
      this.labels.push({ staff: bolt.staff, x: bolt.toX, y: bolt.toY - 18, text: "−" + bolt.damage, age: 0, big: bolt.damage > 1 });
    }
    for (const burst of this.bursts) burst.age += step;
    this.bursts = this.bursts.filter(burst => burst.age < burst.life);
    for (const label of this.labels) { label.age += step; label.y -= step * (label.age < 0.14 ? 40 : 22); }
    this.labels = this.labels.filter(label => label.age < BOLT_LABEL_LIFE).slice(-MAX_LABELS);
  }

  render(ctx: CanvasRenderingContext2D, left: number, top: number): void {
    this.arrows.render(ctx, left, top);
    for (const bolt of this.bolts) {
      const t = Math.min(1, bolt.age / bolt.flight);
      ctx.save();
      ctx.translate(bolt.fromX + (bolt.toX - bolt.fromX) * t - left, bolt.fromY + (bolt.toY - bolt.fromY) * t - top);
      ctx.rotate(Math.atan2(bolt.toY - bolt.fromY, bolt.toX - bolt.fromX));
      drawSpellBolt(ctx, bolt.staff, t, this.clock);
      ctx.restore();
    }
    for (const burst of this.bursts) {
      ctx.save(); ctx.translate(burst.x - left, burst.y - top);
      drawSpellBurst(ctx, burst.staff, burst.age / burst.life, burst.kill);
      ctx.restore();
    }
    ctx.textAlign = "center"; ctx.lineJoin = "round";
    for (const label of this.labels) {
      const pop = label.age < 0.14 ? 1.6 - 0.6 * (label.age / 0.14) : 1;
      ctx.save(); ctx.translate(label.x - left, label.y - top); ctx.scale(pop, pop);
      ctx.globalAlpha = Math.min(1, (BOLT_LABEL_LIFE - label.age) * 4);
      ctx.font = (label.big ? "800 13px" : "bold 10px") + " system-ui"; ctx.lineWidth = label.big ? 3 : 2.4;
      ctx.strokeStyle = "#18352e"; ctx.fillStyle = STAVES[label.staff].visual.gem.light;
      ctx.strokeText(label.text, 0, 0); ctx.fillText(label.text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}
