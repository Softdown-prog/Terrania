import { ellipse, rgba } from "../../../draw.ts";
import { BuildingKit } from "../buildings/kit.ts";
import { BRONZE, GLINT, OUTLINE, WOOD } from "../buildings/palette.ts";

/**
 * Barril (ADR 0050): aduelas de madeira com a barriga curva, três aros de ferro, o tampo com as tábuas, a mancha escura de
 * alcatrão que escorreu e a sombra no chão.
 */
export function paintCityBarrel(c: CanvasRenderingContext2D): void {
  const k = new BuildingKit(c), b = k.b;
  b.shadow(20, 24);
  const body = (): void => { c.beginPath(); c.moveTo(-9, -3); c.quadraticCurveTo(-12, -11, -9, -19); c.lineTo(9, -19); c.quadraticCurveTo(12, -11, 9, -3); c.closePath(); };
  body(); c.fillStyle = b.gradient(-11, 11, WOOD); c.fill();
  c.save(); body(); c.clip();
  for (const x of [-5, 0, 5]) b.line([[x, -19], [x, -3]], rgba("#1e1410", 0.5), 0.8);
  const tar = c.createLinearGradient(0, -19, 0, -8); tar.addColorStop(0, "rgba(30,20,16,0.7)"); tar.addColorStop(1, "rgba(30,20,16,0)");
  c.fillStyle = tar; c.fillRect(2, -19, 4, 11);
  c.restore();
  for (const y of [-17, -11, -5]) { c.fillStyle = b.gradient(-11, 11, { light: "#8a8f98", base: "#3b3f46", dark: "#1f2227" }); c.fillRect(-11.2, y, 22.4, 1.8); }
  body(); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  // tampo de cima visto de lado: elipse com tábuas e a luz
  ellipse(c, 0, -19, 9, 3, WOOD.light);
  b.line([[-8, -19], [8, -19]], rgba("#1e1410", 0.45), 0.7); b.line([[0, -21.6], [0, -16.4]], rgba("#1e1410", 0.45), 0.7);
  c.beginPath(); c.ellipse(0, -19, 9, 3, 0, 0, Math.PI * 2); c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.stroke();
  ellipse(c, -3, -19.6, 3, 0.9, rgba(GLINT, 0.55));
  ellipse(c, 6, -2, 3, 1.2, rgba(BRONZE.dark, 0.6));
  b.line([[-8, -16], [-8, -5]], rgba(GLINT, 0.5), 0.9);
  b.drift(-9, 1, 6, 1.4, 1);
}
