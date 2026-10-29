/** Landmarks are shared with collision so decorative masonry is never passable. */
export const LANDMARKS = [
  { kind: "arch" as const, x: -176, y: -96, variant: 0.4 },
  { kind: "sign" as const, x: 128, y: -16, variant: 0.2 },
  { kind: "fire" as const, x: 176, y: -112, variant: 0.6 },
];
export function landmarkBlocks(x: number, y: number, radius: number): boolean {
  return LANDMARKS.some((prop) => {
    if (prop.kind === "arch")
      return [-26, 26].some(
        (offset) =>
          Math.abs(x - prop.x - offset) < 9 + radius &&
          Math.abs(y - prop.y) < 8 + radius,
      );
    return (
      Math.hypot(x - prop.x, y - prop.y) <
      radius + (prop.kind === "fire" ? 10 : 4)
    );
  });
}
