import type { Player } from "../actors/Player.ts";
import { clamp01 } from "./draw.ts";

type Shape = "square" | "circle" | "spark" | "ring" | "puff";
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  shape: Shape;
  grav: number;
  drag: number;
}
interface Label {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  max: number;
  big: boolean;
}
interface Decal {
  x: number;
  y: number;
  rx: number;
  ry: number;
  life: number;
  max: number;
  color: string;
}
const BITE_TIME = 0.42;
const GOO = ["#8ed6a0", "#c9f5c6", "#5fae8a", "#a9e8b0"];
/** Disposable, capped visual feedback. This class never applies damage. */
export class Effects {
  enabled = true;
  private particles: Particle[] = [];
  private labels: Label[] = [];
  private decals: Decal[] = [];
  private bites = new Map<string, number>();
  private previous = new Map<string, { hp: number; x: number; y: number }>();
  private hp = 100;
  private lastStep = Number.NaN;
  private seed = 0x9e3779b9;
  /** PRNG determinístico (mulberry32): efeitos reproduzíveis em testes e capturas. */
  private rnd(): number {
    this.seed = (this.seed + 0x6d2b79f5) | 0;
    let t = Math.imul(this.seed ^ (this.seed >>> 15), 1 | this.seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  reset(): void {
    this.particles = [];
    this.labels = [];
    this.decals = [];
    this.bites.clear();
    this.previous.clear();
    this.hp = 100;
    this.lastStep = Number.NaN;
  }
  /** 0..1: quanto a criatura acabou de investir contra o herói (só apresentação). */
  biteAmount(id: string): number {
    const v = this.bites.get(id);
    return v ? Math.pow(clamp01(v / BITE_TIME), 0.7) : 0;
  }
  showGelPickup(player: Pick<Player, "x" | "y">, amount: number): void {
    if (!this.enabled) return;
    this.labels.push({
      x: player.x,
      y: player.y - 56,
      text: `+${amount} Gel de slime`,
      color: "#b9f8c9",
      life: 1.2,
      max: 1.2,
      big: false,
    });
    for (let i = 0; i < 8; i++) this.add(player.x, player.y - 14, "circle", GOO[i % GOO.length] ?? "#8ed6a0", 1 + this.rnd() * 1.4,
      (this.rnd() - 0.5) * 50, -30 - this.rnd() * 30, 0.45 + this.rnd() * 0.3, 80, 1.5);
  }
  private add(x: number, y: number, shape: Shape, color: string, size: number, vx: number, vy: number,
    life: number, grav = 15, drag = 0): void {
    if (this.particles.length >= 220) return;
    this.particles.push({ x, y, vx, vy, life, max: life, size, color, shape, grav, drag });
  }
  /** Leque de faíscas partindo do ponto de impacto, orientado pelo golpe. */
  private impact(x: number, y: number, dirX: number, dirY: number, forge: boolean): void {
    const base = Math.atan2(dirY, dirX);
    const hot = forge ? ["#fff0bf", "#ffb066", "#ff7a35"] : ["#fffbe6", "#fff0bf", "#ffd37a"];
    for (let i = 0; i < 9; i++) {
      const a = base + (this.rnd() - 0.5) * 1.5, sp = 90 + this.rnd() * 110;
      this.add(x, y, "spark", hot[i % hot.length] ?? "#fff0bf", 1.1 + this.rnd() * 0.8,
        Math.cos(a) * sp, Math.sin(a) * sp * 0.7 - 12, 0.16 + this.rnd() * 0.16, 90, 3);
    }
    this.add(x, y, "ring", forge ? "#ffc080" : "#fff3cc", 15 + (forge ? 5 : 0), 0, 0, 0.22, 0, 0);
    this.add(x, y, "puff", "#fff8e0", 8, 0, 0, 0.12, 0, 0);
  }
  private splat(x: number, y: number, count: number, size: number): void {
    for (let i = 0; i < count; i++) {
      const a = this.rnd() * Math.PI * 2, sp = 25 + this.rnd() * 70;
      this.add(x, y, "circle", GOO[i % GOO.length] ?? "#8ed6a0", size * (0.7 + this.rnd() * 0.9),
        Math.cos(a) * sp, Math.sin(a) * sp * 0.6 - 38, 0.4 + this.rnd() * 0.35, 150, 1.2);
    }
  }
  update(
    dt: number,
    player: Player,
    mobs: ReadonlyArray<{ id: string; x: number; y: number; hp: number }>,
  ): { hit: boolean; hurt: boolean } {
    let hit = false;
    const hurt = player.hp < this.hp;
    const forge = player.attackWeapon === "forge";
    if (hurt && this.enabled) {
      for (let i = 0; i < 9; i++) {
        const a = this.rnd() * Math.PI * 2, sp = 40 + this.rnd() * 70;
        this.add(player.x, player.y - 16, i % 3 ? "circle" : "spark", i % 2 ? "#f2b77a" : "#e8744f",
          1.2 + this.rnd() * 1.2, Math.cos(a) * sp, Math.sin(a) * sp * 0.7 - 22, 0.3 + this.rnd() * 0.2, 120, 2);
      }
      this.add(player.x, player.y - 16, "ring", "#f09070", 16, 0, 0, 0.26, 0, 0);
      this.labels.push({
        x: player.x,
        y: player.y - 42,
        text: "−" + (this.hp - player.hp),
        color: "#ffb89a",
        life: 0.9,
        max: 0.9,
        big: true,
      });
    }
    if (hurt) {
      // A criatura mais próxima é quem investiu: dispara a animação de mordida.
      let nearest: string | null = null, best = 70;
      for (const mob of mobs) {
        const d = Math.hypot(mob.x - player.x, mob.y - player.y);
        if (d < best) { best = d; nearest = mob.id; }
      }
      if (nearest) this.bites.set(nearest, BITE_TIME);
    }
    this.hp = player.hp;
    const next = new Map<string, { hp: number; x: number; y: number }>();
    for (const mob of mobs) {
      const old = this.previous.get(mob.id);
      if (old && old.hp > mob.hp) {
        hit = true;
        if (this.enabled) {
          const dx = mob.x - player.x, dy = mob.y - player.y;
          const len = Math.hypot(dx, dy) || 1;
          this.impact(mob.x - (dx / len) * 6, mob.y - 12, dx / len, dy / len, forge);
          this.splat(mob.x, mob.y - 8, 5, 1.2);
          this.labels.push({
            x: mob.x,
            y: mob.y - 32,
            text: "−" + (old.hp - mob.hp),
            color: forge ? "#ffd9a0" : "#fff0bf",
            life: 0.8,
            max: 0.8,
            big: old.hp - mob.hp > 1,
          });
        }
      }
      next.set(mob.id, { hp: mob.hp, x: mob.x, y: mob.y });
    }
    const killDamage = Math.max(1, Number.isFinite(player.strikeDamage) ? player.strikeDamage : 1);
    for (const [id, old] of this.previous)
      if (
        !next.has(id) &&
        old.hp <= killDamage &&
        player.attackTime > 0 &&
        Math.hypot(old.x - player.x, old.y - player.y) < 75
      ) {
        hit = true;
        if (this.enabled) {
          this.splat(old.x, old.y - 8, 22, 1.6);
          this.add(old.x, old.y - 10, "ring", "#bff0c4", 24, 0, 0, 0.32, 0, 0);
          this.add(old.x, old.y - 8, "puff", "#d8f7d4", 15, 0, 0, 0.3, 0, 0);
          this.decals.push({ x: old.x, y: old.y + 1, rx: 17, ry: 6, life: 1.6, max: 1.6, color: "#6cc08e" });
          if (this.decals.length > 10) this.decals.shift();
        }
      }
    this.previous = next;
    // Poeira sincronizada com o apoio de cada pé (a cada meio ciclo de passada).
    const step = Math.floor(player.walkTime / Math.PI);
    if (Number.isFinite(this.lastStep) && step !== this.lastStep && Math.abs(step - this.lastStep) < 4 &&
        this.enabled && Math.hypot(player.vx, player.vy) > 40) {
      const side = step % 2 ? 1 : -1;
      this.add(player.x + side * 3.6, player.y + 1, "puff", "#cbbf94", 3.4, -player.vx * 0.06, -6, 0.42, -4, 2);
      if (this.rnd() > 0.5) this.add(player.x + side * 3, player.y, "square", "#a89c74", 1.2, (this.rnd() - 0.5) * 24, -18 - this.rnd() * 12, 0.3, 120, 1);
    }
    this.lastStep = step;
    if (!this.enabled) {
      this.particles = [];
      this.labels = [];
      this.decals = [];
    }
    for (const p of this.particles) {
      p.life -= dt;
      if (p.drag) {
        const k = Math.exp(-p.drag * dt);
        p.vx *= k; p.vy *= k;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.grav * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const label of this.labels) {
      label.life -= dt;
      label.y -= dt * (label.max - label.life < 0.14 ? 40 : 22);
    }
    this.labels = this.labels.filter((label) => label.life > 0).slice(-24);
    for (const d of this.decals) d.life -= dt;
    this.decals = this.decals.filter((d) => d.life > 0);
    for (const [id, v] of this.bites) {
      const left = v - dt;
      if (left <= 0) this.bites.delete(id); else this.bites.set(id, left);
    }
    return { hit, hurt };
  }
  /** Manchas no chão, desenhadas antes dos personagens. */
  renderGround(ctx: CanvasRenderingContext2D, left: number, top: number): void {
    for (const d of this.decals) {
      const a = Math.min(1, d.life / (d.max * 0.55)) * 0.5;
      ctx.save();
      ctx.translate(d.x - left, d.y - top);
      ctx.scale(1, d.ry / d.rx);
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, d.rx);
      g.addColorStop(0, d.color); g.addColorStop(1, "rgba(108,192,142,0)");
      ctx.globalAlpha = a;
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, d.rx, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  render(ctx: CanvasRenderingContext2D, left: number, top: number): void {
    for (const p of this.particles) {
      const k = Math.max(0, Math.min(1, p.life / p.max));
      ctx.globalAlpha = p.shape === "square" || p.shape === "circle" ? Math.min(1, k * 1.6) : k;
      const x = p.x - left, y = p.y - top;
      if (p.shape === "square") {
        ctx.fillStyle = p.color;
        ctx.fillRect(x, y, p.size, p.size);
      } else if (p.shape === "circle") {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(x, y, p.size * (0.5 + 0.5 * k), 0, Math.PI * 2); ctx.fill();
      } else if (p.shape === "spark") {
        ctx.strokeStyle = p.color; ctx.lineWidth = p.size; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - p.vx * 0.045, y - p.vy * 0.045); ctx.stroke();
      } else if (p.shape === "ring") {
        const r = p.size * (1 - k * k);
        ctx.strokeStyle = p.color; ctx.lineWidth = 0.8 + 2.6 * k;
        ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2); ctx.stroke();
      } else {
        const r = p.size * (1.6 - k * 0.8);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = k * 0.55;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.lineCap = "butt";
    ctx.textAlign = "center";
    ctx.lineJoin = "round";
    for (const label of this.labels) {
      const age = label.max - label.life;
      const pop = age < 0.14 ? 1.6 - 0.6 * (age / 0.14) : 1;
      ctx.save();
      ctx.translate(label.x - left, label.y - top);
      ctx.scale(pop, pop);
      ctx.globalAlpha = Math.min(1, label.life * 4);
      ctx.font = (label.big ? "800 13px" : "bold 10px") + " system-ui";
      ctx.lineWidth = label.big ? 3 : 2.4;
      ctx.strokeStyle = "#18352e";
      ctx.fillStyle = label.color;
      ctx.strokeText(label.text, 0, 0);
      ctx.fillText(label.text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}
