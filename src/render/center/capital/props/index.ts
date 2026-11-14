import { paintCapitalGate } from "./gate.ts";
import { paintCapitalMonument } from "./monument.ts";
import { paintCapitalTower } from "./tower.ts";
import { paintCapitalWall } from "./wall.ts";
import { paintCapitalWallSide } from "./wallSide.ts";

/** Uma peça da capital com pintor próprio: o desenho, quantas variações tem e o tamanho do sprite (largura, altura, origem x e y). */
export interface CapitalPropArt {
  readonly paint: (c: CanvasRenderingContext2D, variant: number) => void;
  readonly variants: number;
  readonly box: readonly [number, number, number, number];
}
/** As peças da capital, por tipo (ADR 0056). */
export const CAPITAL_PROP_ART: Readonly<Record<string, CapitalPropArt>> = {
  wall: { paint: paintCapitalWall, variants: 8, box: [72, 72, 36, 60] },
  "wall-side": { paint: paintCapitalWallSide, variants: 2, box: [48, 104, 18, 96] },
  gate: { paint: paintCapitalGate, variants: 1, box: [320, 164, 160, 150] },
  tower: { paint: paintCapitalTower, variants: 2, box: [96, 200, 48, 184] },
  monument: { paint: paintCapitalMonument, variants: 1, box: [210, 218, 84, 148] },
};
export { paintCapitalGate, paintCapitalMonument, paintCapitalTower, paintCapitalWall, paintCapitalWallSide };
