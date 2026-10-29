import type { Player } from "../actors/Player.ts";
import type { MobState } from "../shared/protocol.ts";
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
}
interface Label {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}
/** Disposable, capped visual feedback. This class never applies damage. */
export class Effects {
  enabled = true;
  private particles: Particle[] = [];
  private labels: Label[] = [];
  private previous = new Map<string, { hp: number; x: number; y: number }>();
  private hp = 100;
  private dustClock = 0;
  reset(): void {
    this.particles = [];
    this.labels = [];
    this.previous.clear();
    this.hp = 100;
  }
  private burst(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count && this.particles.length < 140; i++) {
      const a = i * 2.399 + x,
        speed = 15 + (i % 5) * 11,
        life = 0.25 + (i % 4) * 0.13;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 15,
        life,
        max: life,
        size: 1 + (i % 3),
        color,
      });
    }
  }
  update(
    dt: number,
    player: Player,
    mobs: ReadonlyArray<Pick<MobState, "id" | "x" | "y" | "hp">>,
  ): { hit: boolean; hurt: boolean } {
    let hit = false;
    const hurt = player.hp < this.hp;
    if (hurt && this.enabled) {
      this.burst(player.x, player.y - 14, "#f2b77a", 10);
      this.labels.push({
        x: player.x,
        y: player.y - 42,
        text: "−" + (this.hp - player.hp),
        color: "#ffd8ae",
        life: 0.75,
      });
    }
    this.hp = player.hp;
    const next = new Map<string, { hp: number; x: number; y: number }>();
    for (const mob of mobs) {
      const old = this.previous.get(mob.id);
      if (old && old.hp > mob.hp) {
        hit = true;
        if (this.enabled) {
          this.burst(mob.x, mob.y - 10, "#e9d9a2", 9);
          this.labels.push({
            x: mob.x,
            y: mob.y - 30,
            text: "−" + (old.hp - mob.hp),
            color: "#fff0bf",
            life: 0.65,
          });
        }
      }
      next.set(mob.id, { hp: mob.hp, x: mob.x, y: mob.y });
    }
    for (const [id, old] of this.previous)
      if (
        !next.has(id) &&
        old.hp <= 1 &&
        player.attackTime > 0 &&
        Math.hypot(old.x - player.x, old.y - player.y) < 75
      ) {
        hit = true;
        if (this.enabled) this.burst(old.x, old.y - 10, "#a3d1a1", 18);
      }
    this.previous = next;
    this.dustClock += dt;
    if (
      this.enabled &&
      Math.hypot(player.vx, player.vy) > 60 &&
      this.dustClock > 0.14
    ) {
      this.dustClock = 0;
      this.burst(player.x, player.y + 2, "#bdbb8e", 1);
    }
    if (!this.enabled) {
      this.particles = [];
      this.labels = [];
    }
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 15 * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const label of this.labels) {
      label.life -= dt;
      label.y -= dt * 22;
    }
    this.labels = this.labels.filter((label) => label.life > 0).slice(-24);
    return { hit, hurt };
  }
  render(ctx: CanvasRenderingContext2D, left: number, top: number): void {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.min(1, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - left, p.y - top, p.size, p.size);
    }
    ctx.textAlign = "center";
    ctx.font = "bold 10px system-ui";
    ctx.lineWidth = 2;
    for (const label of this.labels) {
      ctx.globalAlpha = Math.min(1, label.life * 4);
      ctx.strokeStyle = "#18352e";
      ctx.fillStyle = label.color;
      ctx.strokeText(label.text, label.x - left, label.y - top);
      ctx.fillText(label.text, label.x - left, label.y - top);
    }
    ctx.globalAlpha = 1;
  }
}
