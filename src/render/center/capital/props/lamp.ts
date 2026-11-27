import { ellipse, mix, rgba, shade, softShadow } from "../../../draw.ts";
import { GLINT, IRON, OUTLINE } from "../../kit/index.ts";

/**
 * Poste de lampião da capital (ADR 0106): coluna de ferro sobre um soco de pedra, braço curvo e lanterna de vidro com chama que pisca devagar. Origem no pé do poste, no chão;
 * luz de noroeste, então o lado esquerdo clareia e o direito escurece. O desenho é parado (a chama não anima: o sprite é cacheado) e igual em todo poste.
 */
export function paintCapitalLamp(c: CanvasRenderingContext2D, _variant: number): void {
  c.save();
  // 1. Sombra de contato no chão e o soco de pedra.
  softShadow(c, 2, 2, 11, 4, .4);
  const base = c.createLinearGradient(-7, -6, 7, 2);
  base.addColorStop(0, "#b9bcc0"); base.addColorStop(.5, "#85898f"); base.addColorStop(1, "#4d525b");
  c.fillStyle = OUTLINE; c.fillRect(-7.6, -7.4, 15.2, 9.8);
  c.fillStyle = base; c.fillRect(-6.6, -6.4, 13.2, 8);
  c.fillStyle = rgba(GLINT, .35); c.fillRect(-6.6, -6.4, 13.2, 1.2);
  // 2. A coluna de ferro, com luz de um lado e sombra do outro, e as molduras (anéis).
  const shaft = c.createLinearGradient(-2.6, 0, 2.6, 0);
  shaft.addColorStop(0, mix(IRON, GLINT, .22)); shaft.addColorStop(.5, IRON); shaft.addColorStop(1, shade(IRON, -.45));
  c.fillStyle = OUTLINE; c.fillRect(-3.4, -52, 6.8, 46);
  c.fillStyle = shaft; c.fillRect(-2.6, -52, 5.2, 46);
  for (const y of [-12, -30, -48]) { c.fillStyle = OUTLINE; c.fillRect(-4.6, y - 1.6, 9.2, 3.2); c.fillStyle = mix(IRON, GLINT, .16); c.fillRect(-3.8, y - .8, 7.6, 1.6); }
  // 3. O braço curvo que segura a lanterna.
  c.lineCap = "round";
  c.strokeStyle = OUTLINE; c.lineWidth = 4.6;
  c.beginPath(); c.moveTo(0, -50); c.quadraticCurveTo(0, -62, 8.5, -62); c.stroke();
  c.strokeStyle = IRON; c.lineWidth = 2.8;
  c.beginPath(); c.moveTo(0, -50); c.quadraticCurveTo(0, -60.5, 8.5, -60.5); c.stroke();
  c.strokeStyle = rgba(GLINT, .4); c.lineWidth = .9;
  c.beginPath(); c.moveTo(-.8, -50); c.quadraticCurveTo(-.8, -61, 7.5, -61.4); c.stroke();
  // 4. A lanterna: telhadinho, vidro com a luz acesa e a chama.
  const lx = 8.5, ly = -57;
  c.fillStyle = OUTLINE;
  c.beginPath(); c.moveTo(lx - 7.4, ly - 8); c.lineTo(lx, ly - 15); c.lineTo(lx + 7.4, ly - 8); c.closePath(); c.fill();
  c.fillStyle = mix("#b8452f", GLINT, .12);
  c.beginPath(); c.moveTo(lx - 6.2, ly - 8.6); c.lineTo(lx, ly - 13.6); c.lineTo(lx + 6.2, ly - 8.6); c.closePath(); c.fill();
  c.fillStyle = OUTLINE; c.fillRect(lx - 6.4, ly - 8, 12.8, 16.4);
  const glass = c.createLinearGradient(lx - 5, ly - 7, lx + 5, ly + 7);
  glass.addColorStop(0, "#fff0b8"); glass.addColorStop(.5, "#ffd36a"); glass.addColorStop(1, "#d9892f");
  c.fillStyle = glass; c.fillRect(lx - 5.2, ly - 6.8, 10.4, 13.6);
  ellipse(c, lx, ly + .5, 2.2, 3.6, rgba("#fffbe6", .95));
  c.strokeStyle = OUTLINE; c.lineWidth = 1.1;
  c.beginPath(); c.moveTo(lx, ly - 7); c.lineTo(lx, ly + 7); c.stroke();
  c.fillStyle = IRON; c.fillRect(lx - 6.4, ly + 6.6, 12.8, 2);
  // 5. O halo quente em volta da lanterna e o brilho no vidro, por último.
  const halo = c.createRadialGradient(lx, ly, 2, lx, ly, 30);
  halo.addColorStop(0, rgba("#ffd36a", .42)); halo.addColorStop(1, rgba("#ffd36a", 0));
  c.fillStyle = halo; c.fillRect(lx - 30, ly - 30, 60, 60);
  c.fillStyle = rgba(GLINT, .8); c.fillRect(lx - 4.2, ly - 6, 1.6, 8);
  c.restore();
}
