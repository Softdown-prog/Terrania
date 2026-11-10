import { regionalLandmarkBlocks } from "./regionalLandmarks.ts";
import { southRuinBlocks } from "./southRuins.ts";
import { southTowerBlocks } from "./towers/placement.ts";
/** Landmarks are shared with collision so decorative masonry is never passable. */
export const LANDMARKS = [
  { kind: "arch" as const, x: -176, y: -96, variant: 0.4 },
  { kind: "sign" as const, x: 128, y: -16, variant: 0.2 },
  { kind: "fire" as const, x: 176, y: -112, variant: 0.6 },
  { kind: "sign" as const, x: 240, y: 64, variant: 0.3 },
  { kind: "sign" as const, x: 448, y: 48, variant: 0.7 },
  { kind: "sign" as const, x: 864, y: 48, variant: 0.4 },
  { kind: "sign" as const, x: 1200, y: 304, variant: 0.8 },
  { kind: "arch" as const, x: 1216, y: 368, variant: 0.2 },
];
export function landmarkBlocks(x: number, y: number, radius: number, seed?: number): boolean {
  return (seed !== undefined && (regionalLandmarkBlocks(x, y, radius, seed) || southRuinBlocks(x, y, radius, seed) ||
    southTowerBlocks(x, y, radius, seed))) || LANDMARKS.some((prop) => {
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
