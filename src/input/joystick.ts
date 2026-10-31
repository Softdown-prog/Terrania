/** Vetor analógico estável para mouse e touch (independente do DOM). */
export interface StickVector {
  x: number;
  y: number;
  thumbX: number;
  thumbY: number;
}
export function stickVector(dx: number, dy: number, radius: number): StickVector {
  const zero = { x: 0, y: 0, thumbX: 0, thumbY: 0 };
  if (!Number.isFinite(dx) || !Number.isFinite(dy) ||
      !Number.isFinite(radius) || radius <= 0) return zero;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return zero;
  const travel = Math.min(1, distance / radius);
  // Pequenos tremores do polegar não devem deslocar o personagem.
  const deadZone = 0.13;
  const strength = travel <= deadZone ? 0 : (travel - deadZone) / (1 - deadZone);
  const ux = dx / distance, uy = dy / distance;
  return {
    x: ux * strength, y: uy * strength,
    thumbX: ux * travel * radius, thumbY: uy * travel * radius,
  };
}
