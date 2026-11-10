import { ellipse, rgba } from "./draw.ts";

/** Casca, raízes e samambaias: detalhe independente das árvores do mundo. */
export const paintTrunk = (c: CanvasRenderingContext2D, pine: boolean): void => {
  const w = pine ? 4.6 : 6;
  const g = c.createLinearGradient(-w, 0, w, 0);
  g.addColorStop(0, "#8a7650"); g.addColorStop(0.45, "#5f5237"); g.addColorStop(1, "#33301f");
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(-w, -30); c.lineTo(w, -30);
  c.quadraticCurveTo(w - 0.5, -8, w + 4.4, 1.5);
  c.quadraticCurveTo(0, 3.4, -w - 4.4, 1.5);
  c.quadraticCurveTo(-w + 0.5, -8, -w, -30);
  c.closePath(); c.fill();
  c.strokeStyle = rgba("#20200f", 0.5); c.lineWidth = 0.9;
  for (let i = 0; i < 6; i++) {
    const x = -w + 2 + (i % 3) * 3;
    c.beginPath(); c.moveTo(x, -26 + i * 3.5); c.lineTo(x + (i % 2 ? 1 : -1), -19 + i * 3.5); c.stroke();
  }
  c.strokeStyle = rgba("#b9a77a", 0.45); c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(-w + 1.6, -28); c.lineTo(-w + 2.2, -4); c.stroke();
  // raízes e musgo
  c.strokeStyle = "#3f3b27"; c.lineWidth = 3; c.lineCap = "round";
  c.beginPath(); c.moveTo(-w - 3, 2.6); c.lineTo(-w + 0.5, -2); c.moveTo(w + 3, 2.4); c.lineTo(w - 0.5, -2); c.stroke();
  c.lineCap = "butt";
  ellipse(c, -w + 1.2, -3, 2.4, 3.6, rgba("#7e9e55", 0.7));
  // samambaias na base
  c.strokeStyle = "#8da155"; c.lineWidth = 1;
  for (let i = -3; i <= 3; i++) {
    c.beginPath(); c.moveTo(i * 3, 3);
    c.quadraticCurveTo(i * 5.4, -5 - Math.abs(i), i * 7.2, -1 + Math.abs(i) * 0.6); c.stroke();
  }
};
