import { rgba } from "../../../draw.ts";
import { noise } from "../../kit/index.ts";
import { BuildingKit } from "../buildings/kit.ts";
import { BONE, CLAY, CLAY_WEAR, GLINT, OUTLINE, STONE } from "../buildings/palette.ts";

/** Largura de um trecho de muralha (2 tiles) e a altura do corpo e das ameias, em px. */
export const WALL_HALF = 32, WALL_TOP = -34, MERLON_H = 11;

/**
 * Trecho da muralha do Poço Negro (ADR 0049): 64 px de largura, a mesma peça para os lados norte, sul, leste e oeste.
 * Os trechos se encostam, então tudo o que precisa continuar de um para o outro (as fiadas, as juntas dos tijolos e as
 * ameias) tem período que divide 64 px e não depende da variação; só o desgaste (remendo, rachadura, fresta, riscos) muda
 * de um trecho para outro e fica longe das bordas.
 */
export function paintCityWall(c: CanvasRenderingContext2D, variant: number): void {
  const v = Math.abs(Math.floor(Number.isFinite(variant) ? variant : 0)) % 4, k = new BuildingKit(c), b = k.b;
  // sombra no chão, na frente do muro (a luz vem de noroeste)
  const cast = c.createLinearGradient(0, 0, 0, 9);
  cast.addColorStop(0, "rgba(34,26,43,0.38)"); cast.addColorStop(1, "rgba(34,26,43,0)");
  c.fillStyle = cast; c.fillRect(-WALL_HALF, 0, WALL_HALF * 2, 9);
  // corpo de tijolo de barro: degradê de volume, fiadas de 8 px e juntas alternadas com período de 16 px
  const body = (): void => { c.beginPath(); c.rect(-WALL_HALF, WALL_TOP, WALL_HALF * 2, -WALL_TOP); };
  body(); c.fillStyle = b.gradient(-WALL_HALF, WALL_HALF, CLAY); c.fill();
  c.save(); body(); c.clip();
  for (let row = 0, y = -8; y > WALL_TOP; row++, y -= 8) {
    b.line([[-WALL_HALF, y], [WALL_HALF, y]], rgba(CLAY.dark, 0.5), 0.9);
    for (let x = -WALL_HALF + (row % 2) * 8; x < WALL_HALF; x += 16) {
      b.line([[x, y], [x, y + 8]], rgba(CLAY.dark, 0.42), 0.8);
      const tone = noise(row * 4 + Math.floor((x + 32) / 16), v, 261);
      if (tone > 0.78) { c.fillStyle = rgba(CLAY.light, 0.22); c.fillRect(x + 1, y + 1, 14, 6); }
      else if (tone < 0.18) { c.fillStyle = rgba(CLAY.dark, 0.2); c.fillRect(x + 1, y + 1, 14, 6); }
    }
  }
  // desgaste só no miolo do trecho: riscos de chuva dos vãos das ameias, remendo claro, rachaduras e frestas
  for (const x of [-24, -8, 8, 24]) {
    const g = c.createLinearGradient(0, WALL_TOP, 0, WALL_TOP + 20 + noise(x, v, 263) * 8);
    g.addColorStop(0, rgba(CLAY_WEAR.stain, 0.42)); g.addColorStop(1, rgba(CLAY_WEAR.stain, 0));
    c.fillStyle = g; c.fillRect(x - 1, WALL_TOP, 2.6, 28);
  }
  if (v % 2 === 1) { // remendo de gesso novo sobre o tijolo velho
    c.fillStyle = rgba(CLAY.light, 0.5); c.fillRect(-14, -26, 22, 12);
    c.strokeStyle = rgba(CLAY.dark, 0.6); c.lineWidth = 0.8; c.setLineDash([2.4, 1.6]); c.strokeRect(-14, -26, 22, 12); c.setLineDash([]);
  }
  for (const [sx, sy] of v < 2 ? [[-4, -30], [16, -22]] as const : [[10, -31], [-18, -20]] as const) {
    c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(sx + 3, sy + 6, sx - 1, sy + 11); c.quadraticCurveTo(sx - 4, sy + 15, sx + 1, sy + 19);
    c.strokeStyle = rgba("#2c1f14", 0.62); c.lineWidth = 0.9; c.stroke();
  }
  if (v === 2) { // fresta de arqueiro com a ponta em arco
    c.fillStyle = "#0b1519"; c.beginPath(); c.moveTo(-18, -14); c.lineTo(-18, -26); c.arc(-15.5, -26, 2.5, Math.PI, 0); c.lineTo(-13, -14); c.closePath(); c.fill();
    c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.stroke();
    b.line([[-12.6, -25], [-12.6, -15]], rgba(GLINT, 0.4), 0.8);
  }
  // soco de pedra na base, mais escuro, com a umidade que sobe do chão
  c.fillStyle = b.gradient(-WALL_HALF, WALL_HALF, STONE); c.fillRect(-WALL_HALF, -8, WALL_HALF * 2, 8);
  for (let x = -WALL_HALF; x < WALL_HALF; x += 16) b.line([[x, -8], [x, 0]], rgba("#000000", 0.35), 0.8);
  b.line([[-WALL_HALF, -8], [WALL_HALF, -8]], rgba(GLINT, 0.25), 0.9);
  const damp = c.createLinearGradient(0, -16, 0, -8); damp.addColorStop(0, "rgba(61,38,22,0)"); damp.addColorStop(1, "rgba(61,38,22,0.35)");
  c.fillStyle = damp; c.fillRect(-WALL_HALF, -16, WALL_HALF * 2, 8);
  c.restore();
  // cornija que avança 2 px, com a sombra dela na parede, e as ameias de osso (período de 16 px)
  c.fillStyle = b.gradient(-WALL_HALF, WALL_HALF, BONE); c.fillRect(-WALL_HALF, WALL_TOP - 4, WALL_HALF * 2, 4);
  c.fillStyle = rgba(GLINT, 0.55); c.fillRect(-WALL_HALF, WALL_TOP - 4, WALL_HALF * 2, 0.9);
  const under = c.createLinearGradient(0, WALL_TOP, 0, WALL_TOP + 6); under.addColorStop(0, "rgba(34,26,43,0.4)"); under.addColorStop(1, "rgba(34,26,43,0)");
  c.fillStyle = under; c.fillRect(-WALL_HALF, WALL_TOP, WALL_HALF * 2, 6);
  c.strokeStyle = OUTLINE; c.lineWidth = 1; c.strokeRect(-WALL_HALF, WALL_TOP - 4, WALL_HALF * 2, 4);
  for (const x of [-24, -8, 8, 24]) {
    c.fillStyle = b.gradient(x - 5, x + 5, BONE); c.fillRect(x - 5, WALL_TOP - 4 - MERLON_H, 10, MERLON_H);
    c.fillStyle = BONE.light; c.fillRect(x - 6, WALL_TOP - 4 - MERLON_H - 2, 12, 2.4);
    c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(x - 5, WALL_TOP - 4 - MERLON_H, 10, MERLON_H);
    if (noise(x, v, 265) > 0.7) { c.fillStyle = rgba(CLAY_WEAR.stain, 0.7); c.fillRect(x - 5, WALL_TOP - 4 - MERLON_H, 3, 4); } // ameia lascada
  }
  c.strokeStyle = OUTLINE; c.lineWidth = 1.1; c.strokeRect(-WALL_HALF, WALL_TOP, WALL_HALF * 2, -WALL_TOP);
  // areia que o vento deixou ao pé do muro, só no miolo para não cortar na emenda
  const rx1 = 11 + noise(v, 2, 269) * 4, rx2 = 10 + noise(v, 4, 273) * 4;
  b.drift(-WALL_HALF + rx1 + 1 + noise(v, 1, 267) * 6, 3, rx1, 2.4, v);
  b.drift(WALL_HALF - rx2 - 1 - noise(v, 3, 271) * 6, 4, rx2, 2.2, v + 1);
  b.line([[-WALL_HALF + 1.4, WALL_TOP - 1], [WALL_HALF - 1.4, WALL_TOP - 1]], rgba(GLINT, 0.4), 0.9);
}
