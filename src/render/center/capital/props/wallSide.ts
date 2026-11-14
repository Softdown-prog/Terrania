import { ellipse, rgba } from "../../../draw.ts";
import { GLINT, GRANITE, IRON, LIMESTONE, MOSS, OUTLINE, STAIN, StoneBrush, noise } from "../../kit/index.ts";

/** Meia largura da faixa do muro (1 tile = 32 px, o muro ocupa 28), o comprimento de um trecho (2 tiles) e a altura do muro, em px. */
export const SIDE_HALF = 14, SIDE_LENGTH = 64, SIDE_HEIGHT = 30;
/** A cada quantos px se repetem as ameias e as emendas das lajes ao longo do muro: divide 64. */
export const SIDE_PERIOD = 16;

/**
 * Trecho do muro de lado da capital (muros oeste e leste; ADR 0056), visto de cima e de frente: o chão do adarve em lajes
 * (emendas a cada 8 px) entre duas fileiras de ameias (uma a cada 16 px, com a laje de cima e a face da frente), a sombra do
 * muro caindo para o leste, e, no pé do trecho, a ponta de alvenaria. Vem em duas variações; o musgo e as manchas só mudam
 * no miolo. A origem é o centro do pé do trecho; o trecho sobe 64 px mais a altura do muro.
 */
export function paintCapitalWallSide(c: CanvasRenderingContext2D, variant: number): void {
  const v = Math.abs(Math.floor(Number.isFinite(variant) ? variant : 0)) % 2, b = new StoneBrush(c);
  const top = -SIDE_HEIGHT, far = top - SIDE_LENGTH;
  // sombra no chão, para o leste (luz de noroeste), ao longo de todo o trecho
  const cast = c.createLinearGradient(SIDE_HALF, 0, SIDE_HALF + 14, 0);
  cast.addColorStop(0, "rgba(27,31,42,0.4)"); cast.addColorStop(1, "rgba(27,31,42,0)");
  c.fillStyle = cast; c.fillRect(SIDE_HALF, far + SIDE_HEIGHT * 0.4, 14, SIDE_LENGTH);
  // ponta de alvenaria do pé do trecho (a que se vê quando o trecho é o último): fiadas de 8 px e soco de granito
  c.fillStyle = b.gradient(-SIDE_HALF, SIDE_HALF, LIMESTONE); c.fillRect(-SIDE_HALF, top, SIDE_HALF * 2, SIDE_HEIGHT);
  for (let y = -8; y > top; y -= 8) b.line([[-SIDE_HALF, y], [SIDE_HALF, y]], rgba(LIMESTONE.dark, 0.5), 0.9);
  for (let row = 0, y = -8; y > top; row++, y -= 8) for (let x = -SIDE_HALF + 3 + (row % 2) * 8; x < SIDE_HALF; x += 14) b.line([[x, y], [x, y + 8]], rgba(LIMESTONE.dark, 0.42), 0.8);
  c.fillStyle = b.gradient(-SIDE_HALF, SIDE_HALF, GRANITE); c.fillRect(-SIDE_HALF, -8, SIDE_HALF * 2, 8);
  b.moss(-SIDE_HALF, SIDE_HALF, -8, 9, v);
  b.glint(-SIDE_HALF, SIDE_HALF, -8, 0.3);
  c.strokeStyle = OUTLINE; c.lineWidth = 1; c.strokeRect(-SIDE_HALF, top, SIDE_HALF * 2, SIDE_HEIGHT);
  // o adarve visto de cima: laje clara com emendas a cada 8 px e as lajes de tom próprio
  c.fillStyle = b.vertical(far, top, LIMESTONE); c.fillRect(-SIDE_HALF, far, SIDE_HALF * 2, SIDE_LENGTH);
  for (let y = far; y < top; y += 8) {
    b.line([[-SIDE_HALF, y], [SIDE_HALF, y]], rgba(LIMESTONE.dark, 0.35), 0.8);
    const tone = noise(Math.round(y), v, 281);
    if (tone > 0.78) { c.fillStyle = rgba(LIMESTONE.light, 0.3); c.fillRect(-6, y + 1, 12, 6); }
    else if (tone < 0.16) { c.fillStyle = rgba(STAIN, 0.14); c.fillRect(-6, y + 1, 12, 6); }
  }
  b.line([[0, far], [0, top]], rgba(LIMESTONE.dark, 0.3), 0.8);
  // ameias nas duas bordas: a cada 16 px, com a laje de cima e a face da frente mais escura
  for (let y = far + 3; y < top; y += SIDE_PERIOD) {
    for (const x of [-SIDE_HALF, SIDE_HALF - 6]) {
      c.fillStyle = b.vertical(y, y + 8, LIMESTONE); c.fillRect(x, y, 6, 8);
      c.fillStyle = b.gradient(x, x + 6, GRANITE); c.fillRect(x, y + 8, 6, 3.4);
      c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.strokeRect(x, y, 6, 11.4);
      b.line([[x + 0.8, y + 0.8], [x + 5.2, y + 0.8]], rgba(GLINT, 0.55), 0.8);
      ellipse(c, x + 2.2, y + 3, 1.4, 0.9, rgba(GLINT, 0.28)); ellipse(c, x + 3.6, y + 6.2, 1.2, 0.8, rgba(STAIN, 0.3));
    }
    // sombra da ameia do lado de dentro, caindo sobre a laje
    const sh = c.createLinearGradient(-SIDE_HALF + 6, 0, -SIDE_HALF + 11, 0);
    sh.addColorStop(0, "rgba(27,31,42,0.3)"); sh.addColorStop(1, "rgba(27,31,42,0)");
    c.fillStyle = sh; c.fillRect(-SIDE_HALF + 6, y + 1, 5, 9);
  }
  // líquen de dois tons e um risco de ferrugem no adarve, em lugares que mudam de uma variação para outra
  for (let i = 0; i < 3; i++) {
    const lx = -5 + noise(i, v, 341) * 10, ly = far + 14 + i * 20 + noise(i, v, 343) * 8, big = 1.8 + noise(i, v, 345) * 1.6;
    ellipse(c, lx, ly, big, big * 0.7, rgba(i % 2 ? "#d9a14f" : "#c9c27c", 0.55)); ellipse(c, lx - 0.5, ly - 0.4, big * 0.4, big * 0.28, rgba("#f3eab0", 0.6));
  }
  const rust = c.createLinearGradient(0, far + 20, 0, far + 40); rust.addColorStop(0, "rgba(138,90,58,0.45)"); rust.addColorStop(1, "rgba(138,90,58,0)");
  c.fillStyle = rust; c.fillRect(-2 + noise(3, v, 347) * 4, far + 20, 2.4, 20);
  if (v === 1) { // um tufo de musgo e capim nas lajes, longe das pontas do trecho
    for (const [x, y] of [[-3, far + 24], [4, far + 33]] as const) {
      c.fillStyle = rgba(MOSS.base, 0.8); c.beginPath(); c.ellipse(x, y, 3.4, 1.8, 0, 0, Math.PI * 2); c.fill();
      b.line([[x - 1, y], [x - 2, y - 3]], MOSS.light, 0.9); b.line([[x + 1, y], [x + 2.5, y - 3.2]], MOSS.light, 0.9);
    }
  }
  // contorno só dos lados: a emenda entre um trecho e o seguinte não pode ter linha escura
  b.line([[-SIDE_HALF, far], [-SIDE_HALF, top]], OUTLINE, 1); b.line([[SIDE_HALF, far], [SIDE_HALF, top]], OUTLINE, 1);
  b.line([[-SIDE_HALF + 1, far + 1], [-SIDE_HALF + 1, top]], rgba(IRON, 0.25), 0.8);
}
