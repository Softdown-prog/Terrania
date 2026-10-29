import type { CollisionMap } from "../world/collision.ts";

export const ATTACK_DURATION = 0.28;
export const ATTACK_COOLDOWN = 0.42;
export const ATTACK_WINDUP = 0.07;
export const ATTACK_REACH = 52;

/** Same reach, cone and line of sight for local and authoritative combat. */
export function canStrike(
  attacker: { x: number; y: number; faceX: number; faceY: number },
  target: { x: number; y: number },
  world: CollisionMap,
): boolean {
  const dx = target.x - attacker.x,
    dy = target.y - attacker.y;
  const distance = Math.hypot(dx, dy);
  const facingLength = Math.hypot(attacker.faceX, attacker.faceY) || 1;
  if (
    distance >= ATTACK_REACH ||
    (dx * attacker.faceX + dy * attacker.faceY) /
      (Math.max(1, distance) * facingLength) <
      -0.1
  )
    return false;
  const steps = Math.ceil(distance / 6);
  for (let i = 1; i <= steps; i++) {
    if (
      !world.canMove(
        attacker.x + (dx * i) / steps,
        attacker.y + (dy * i) / steps,
      )
    )
      return false;
  }
  return true;
}
