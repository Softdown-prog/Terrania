/** Camera state in world units; independent of Canvas, DOM and frame rate. */
export class Camera {
  x = 16;
  y = 16;
  zoom = 1.65;
  targetZoom = 1.65;
  private trauma = 0;
  private clock = 0;
  reducedMotion = false;
  snap(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.trauma = 0;
  }
  setZoom(value: number): void {
    if (Number.isFinite(value))
      this.targetZoom = Math.min(2.5, Math.max(1, value));
  }
  shake(strength: number): void {
    if (!this.reducedMotion) this.trauma = Math.min(1, this.trauma + strength);
  }
  update(
    dt: number,
    target: { x: number; y: number; vx: number; vy: number },
  ): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    this.clock += dt;
    const tx = target.x + (this.reducedMotion ? 0 : target.vx * 0.17);
    const ty = target.y + (this.reducedMotion ? 0 : target.vy * 0.17);
    if (Math.hypot(target.x - this.x, target.y - this.y) > 280)
      this.snap(target.x, target.y);
    const follow = 1 - Math.exp(-7 * dt);
    this.x += (tx - this.x) * follow;
    this.y += (ty - this.y) * follow;
    this.zoom += (this.targetZoom - this.zoom) * (1 - Math.exp(-9 * dt));
    this.trauma = this.reducedMotion ? 0 : Math.max(0, this.trauma - dt * 3);
  }
  get renderX(): number {
    return this.x + Math.sin(this.clock * 93) * this.trauma * 3;
  }
  get renderY(): number {
    return this.y + Math.cos(this.clock * 81) * this.trauma * 2;
  }
}
