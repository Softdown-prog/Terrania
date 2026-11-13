import { ellipse, rgba } from "../../../draw.ts";
import { noise } from "../../kit/index.ts";
import { BuildingKit } from "../buildings/kit.ts";
import { CLAY, GLINT, OUTLINE, SAND, STRAW, WOOD } from "../buildings/palette.ts";

/**
 * Curral dos lagartos de montaria (ADR 0050): chão de terra pisada com pegadas, duas cercas de estacas e três travessas, mourões nas
 * pontas, um fardo de palha e um cocho. As travessas de trás ficam mais escuras que as da frente.
 */
export function paintCityCorral(c: CanvasRenderingContext2D): void {
  const k = new BuildingKit(c), b = k.b;
  // chão do curral: elipse de terra pisada, mais escura no meio, com pegadas de três dedos
  const dirt = c.createRadialGradient(-10, -4, 4, 0, 2, 70);
  dirt.addColorStop(0, SAND.base); dirt.addColorStop(1, CLAY.dark);
  c.fillStyle = dirt; c.beginPath(); c.ellipse(0, 3, 68, 22, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = rgba(OUTLINE, 0.6); c.lineWidth = 0.9; c.stroke();
  for (let i = 0; i < 12; i++) {
    const x = -50 + noise(i, 1, 311) * 100, y = -6 + noise(i, 2, 313) * 18;
    for (const d of [-1.6, 0, 1.6]) b.line([[x, y], [x + d, y - 2.4]], rgba(CLAY.dark, 0.7), 0.8);
  }
  // cerca de trás (mais escura) e cerca da frente
  const fence = (y: number, ramp: typeof WOOD, front: boolean): void => {
    for (const dy of [-12, -6, 0]) {
      c.fillStyle = b.gradient(-66, 66, ramp); c.fillRect(-66, y + dy - 1.6, 132, 3);
      c.strokeStyle = OUTLINE; c.lineWidth = 0.7; c.strokeRect(-66, y + dy - 1.6, 132, 3);
      if (front) b.line([[-66, y + dy - 1.1], [66, y + dy - 1.1]], rgba(GLINT, 0.35), 0.7);
    }
    for (let x = -60; x <= 60; x += 15) {
      c.fillStyle = b.gradient(x - 2, x + 2, ramp); c.fillRect(x - 2, y - 14, 4, 16);
      c.strokeStyle = OUTLINE; c.lineWidth = 0.7; c.strokeRect(x - 2, y - 14, 4, 16);
      ellipse(c, x, y - 14, 2, 1, ramp.light);
    }
  };
  fence(-15, { light: "#7a5236", base: "#5a3a24", dark: "#3a2416" }, false);
  fence(21, WOOD, true);
  // mourões das pontas, mais altos, com um caveira de aviso no da esquerda
  for (const x of [-64, 64]) {
    c.fillStyle = b.gradient(x - 2, x + 2, WOOD); c.fillRect(x - 2, -26, 4, 48);
    c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.strokeRect(x - 2, -26, 4, 48);
  }
  k.skull(-64, -25, 0.8);
  // fardo de palha e cocho
  c.fillStyle = b.gradient(30, 52, STRAW); c.fillRect(30, 2, 22, 12);
  for (let i = 0; i < 8; i++) b.line([[31 + i * 2.7, 3], [32 + i * 2.7, 13]], rgba(i % 2 ? STRAW.light : STRAW.dark, 0.7), 0.9);
  b.line([[30, 8], [52, 8]], "#6a4a2a", 1.4);
  c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.strokeRect(30, 2, 22, 12);
  c.fillStyle = b.gradient(-46, -26, WOOD); c.fillRect(-46, 4, 20, 8);
  ellipse(c, -36, 4, 9, 1.6, "#2f6f73");
  c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.strokeRect(-46, 4, 20, 8);
  k.bone(-12, 12, -3, 14, 1.4);
  b.drift(-58, 22, 12, 2.4, 1); b.drift(56, 24, 11, 2.2, 2);
}
