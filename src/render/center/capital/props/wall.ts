import { ellipse, rgba } from "../../../draw.ts";
import { GLINT, GRANITE, IRON, LIMESTONE, MOSS, OUTLINE, STAIN, StoneBrush, noise } from "../../kit/index.ts";

/** Meia largura de um trecho de muralha (2 tiles = 64 px), a altura do corpo e a das ameias, em px. */
export const WALL_HALF = 32, WALL_TOP = -38, MERLON_H = 12;
/** A cada quantos px se repetem as ameias (e as juntas): divide 64, para os trechos se encostarem sem emenda. */
export const WALL_PERIOD = 16;

/**
 * Trecho da muralha da capital, visto de frente (muros norte e sul; ADR 0056): calcário em fiadas de 8 px com juntas
 * alternadas a cada 16 px, soco de granito, cornija com mísulas e ameias de pedra a cada 16 px. Os trechos se encostam,
 * então o que atravessa a emenda tem período fixo e só o desgaste (musgo, hera, rachadura, fresta, riscos de chuva) muda
 * de um para outro, longe das bordas. As variações 4 a 7 são o meio trecho (32 px) da 0 a 3, que fecha uma ponta ímpar.
 */
export function paintCapitalWall(c: CanvasRenderingContext2D, variant: number): void {
  const n = Math.abs(Math.floor(Number.isFinite(variant) ? variant : 0)) % 8, half = n >= 4, v = n % 4, b = new StoneBrush(c);
  c.save();
  if (half) { c.beginPath(); c.rect(-WALL_HALF / 2, WALL_TOP - MERLON_H - 12, WALL_HALF, -WALL_TOP + MERLON_H + 24); c.clip(); }
  // sombra no chão, na frente do muro (a luz vem de noroeste)
  const cast = c.createLinearGradient(0, 0, 0, 10);
  cast.addColorStop(0, "rgba(27,31,42,0.4)"); cast.addColorStop(1, "rgba(27,31,42,0)");
  c.fillStyle = cast; c.fillRect(-WALL_HALF, 0, WALL_HALF * 2, 10);
  // corpo de calcário: degradê de volume, fiadas de 8 px e juntas alternadas com período de 16 px
  c.fillStyle = b.gradient(-WALL_HALF, WALL_HALF, LIMESTONE); c.fillRect(-WALL_HALF, WALL_TOP, WALL_HALF * 2, -WALL_TOP);
  c.save(); c.beginPath(); c.rect(-WALL_HALF, WALL_TOP, WALL_HALF * 2, -WALL_TOP); c.clip();
  for (let row = 0, y = -8; y > WALL_TOP; row++, y -= 8) {
    b.line([[-WALL_HALF, y], [WALL_HALF, y]], rgba(LIMESTONE.dark, 0.55), 0.9);
    for (let x = -WALL_HALF + (row % 2) * 8; x < WALL_HALF; x += WALL_PERIOD) {
      b.line([[x, y], [x, y + 8]], rgba(LIMESTONE.dark, 0.45), 0.8);
      const tone = noise(row * 4 + Math.floor((x + 32) / 16), v, 261);
      if (tone > 0.8) { c.fillStyle = rgba(LIMESTONE.light, 0.3); c.fillRect(x + 1, y + 1, 14, 6); }
      else if (tone < 0.16) { c.fillStyle = rgba(LIMESTONE.dark, 0.18); c.fillRect(x + 1, y + 1, 14, 6); }
    }
  }
  // riscos de chuva que descem dos vãos das ameias (no miolo do trecho)
  for (const x of [-24, -8, 8, 24]) b.streak(x, WALL_TOP, 18 + noise(x, v, 263) * 10, 0.4);
  if (v === 0 || v === 3) b.moss(-26, 26, -9, 14 + v * 3, v);
  // líquen sobre a pedra, de dois tons, em manchas pequenas que mudam de lugar de uma variação para outra
  for (let i = 0; i < 3; i++) {
    const lx = -22 + i * 18 + noise(i, v, 331) * 8, ly = -34 + noise(i, v, 333) * 18, big = 2 + noise(i, v, 335) * 1.8;
    ellipse(c, lx, ly, big, big * 0.7, rgba(i % 2 ? "#d9a14f" : "#c9c27c", 0.5));
    ellipse(c, lx - 0.6, ly - 0.4, big * 0.45, big * 0.3, rgba("#f3eab0", 0.55));
  }
  // um risco de ferrugem de uma fresta de ferro na pedra, escorrendo para baixo
  const rust = c.createLinearGradient(0, -33, 0, -15); rust.addColorStop(0, "rgba(138,90,58,0.5)"); rust.addColorStop(1, "rgba(138,90,58,0)");
  c.fillStyle = rust; c.fillRect(-19 + noise(7, v, 337) * 36, -33, 2.4, 18);
  if (v === 1) { // remendo de pedra mais nova e uma rachadura que o atravessa
    c.fillStyle = rgba(LIMESTONE.light, 0.55); c.fillRect(-14, -30, 24, 14);
    c.strokeStyle = rgba(LIMESTONE.dark, 0.7); c.lineWidth = 0.8; c.setLineDash([3, 2]); c.strokeRect(-14, -30, 24, 14); c.setLineDash([]);
    c.beginPath(); c.moveTo(14, -34); c.quadraticCurveTo(17, -27, 13, -21); c.quadraticCurveTo(10, -16, 14, -10);
    c.strokeStyle = rgba(STAIN, 0.7); c.lineWidth = 0.9; c.stroke();
  }
  if (v === 2) { // fresta de arqueiro com a ponta em arco e a pedra da soleira
    c.fillStyle = "#0d1118"; c.beginPath(); c.moveTo(-3, -14); c.lineTo(-3, -28); c.arc(0, -28, 3, Math.PI, 0); c.lineTo(3, -14); c.closePath(); c.fill();
    c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
    c.fillStyle = b.gradient(-5, 5, LIMESTONE); c.fillRect(-5, -14, 10, 2.4);
    b.line([[3.4, -27], [3.4, -15]], rgba(GLINT, 0.4), 0.8);
  }
  if (v === 3) { // hera que sobe pelo muro: caule em curva e folhas
    c.beginPath(); c.moveTo(-12, -9); c.quadraticCurveTo(-18, -20, -11, -27); c.quadraticCurveTo(-8, -31, -12, -35);
    c.strokeStyle = MOSS.dark; c.lineWidth = 1.1; c.stroke();
    for (const [x, y] of [[-15, -14], [-14, -20], [-10, -26], [-13, -31], [-9, -22]] as const) {
      ellipse(c, x, y, 2.6, 1.5, MOSS.base); ellipse(c, x - 0.6, y - 0.4, 1.2, 0.6, rgba(MOSS.light, 0.8));
    }
  }
  // soco de granito na base, mais escuro, com a umidade que sobe do chão
  c.fillStyle = b.gradient(-WALL_HALF, WALL_HALF, GRANITE); c.fillRect(-WALL_HALF, -8, WALL_HALF * 2, 8);
  for (let x = -WALL_HALF; x < WALL_HALF; x += WALL_PERIOD) b.line([[x, -8], [x, 0]], rgba("#000000", 0.35), 0.8);
  b.glint(-WALL_HALF, WALL_HALF, -8, 0.3);
  const damp = c.createLinearGradient(0, -18, 0, -8); damp.addColorStop(0, "rgba(40,52,38,0)"); damp.addColorStop(1, "rgba(40,52,38,0.3)");
  c.fillStyle = damp; c.fillRect(-WALL_HALF, -18, WALL_HALF * 2, 10);
  c.restore();
  // cornija que avança 2 px, com as mísulas por baixo (período de 8 px) e a sombra dela na parede
  const under = c.createLinearGradient(0, WALL_TOP, 0, WALL_TOP + 8); under.addColorStop(0, "rgba(27,31,42,0.42)"); under.addColorStop(1, "rgba(27,31,42,0)");
  c.fillStyle = under; c.fillRect(-WALL_HALF, WALL_TOP, WALL_HALF * 2, 8);
  for (let x = -WALL_HALF + 2; x < WALL_HALF; x += 8) {
    c.fillStyle = b.vertical(WALL_TOP, WALL_TOP + 5, GRANITE); c.fillRect(x, WALL_TOP, 4, 5);
    // o arco pequeno entre duas mísulas (fileira de arcos sob a cornija), escuro por dentro
    c.beginPath(); c.arc(x + 6, WALL_TOP + 0.4, 2.3, 0, Math.PI); c.fillStyle = rgba(OUTLINE, 0.6); c.fill();
  }
  c.fillStyle = b.gradient(-WALL_HALF, WALL_HALF, LIMESTONE); c.fillRect(-WALL_HALF, WALL_TOP - 5, WALL_HALF * 2, 5);
  b.glint(-WALL_HALF, WALL_HALF, WALL_TOP - 5, 0.6);
  b.line([[-WALL_HALF, WALL_TOP], [WALL_HALF, WALL_TOP]], OUTLINE, 1);
  // ameias de pedra a cada 16 px, com a laje de cima e a fresta do lado de dentro
  for (const x of [-24, -8, 8, 24]) {
    const top = WALL_TOP - 5 - MERLON_H;
    c.fillStyle = b.gradient(x - 5, x + 5, LIMESTONE); c.fillRect(x - 5, top, 10, MERLON_H);
    c.fillStyle = b.vertical(top - 2.4, top, LIMESTONE); c.fillRect(x - 6, top - 2.4, 12, 2.4);
    c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(x - 5, top, 10, MERLON_H); c.strokeRect(x - 6, top - 2.4, 12, 2.4);
    b.line([[x - 1, top + 3], [x - 1, top + 9]], rgba(IRON, 0.7), 1.2);
    if (noise(x, v, 265) > 0.72) { c.fillStyle = rgba(STAIN, 0.55); c.fillRect(x - 5, top, 3, 4); } // ameia lascada
  }
  b.line([[-WALL_HALF, 0], [WALL_HALF, 0]], OUTLINE, 1.1);
  c.restore();
}
