import type { CollisionMap } from '../world/collision.ts';
export class Player {
  x = 16; y = 16; hp = 100; maxHp = 100;
  faceX = 0; faceY = 1; walkTime = 0; attackTime = 0; attackCooldown = 0;
  update(dt: number, dir: {x:number; y:number}, world: CollisionMap): void {
    const speed = 126; const dx = dir.x * dt * speed, dy = dir.y * dt * speed;
    if (dir.x || dir.y) {
      this.faceX = dir.x; this.faceY = dir.y;
      this.walkTime += dt * 12;
      if (world.canMove(this.x + dx, this.y)) this.x += dx;
      if (world.canMove(this.x, this.y + dy)) this.y += dy;
    }
    this.attackTime = Math.max(0, this.attackTime - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
  }
  startAttack(): boolean {
    if (this.attackCooldown > 0) return false;
    this.attackTime = 0.20; this.attackCooldown = .38;
    return true;
  }
}
