import { ellipse, rgba } from "../draw.ts";

/** As cores da flecha de junco (ADR 0112): haste de junco seco, ponta de pedra lascada e penas cinzentas de ganso. */
export const REED_ARROW_LOOK = {
  shaft: "#c9b27a", shaftDark: "#8b7745", shaftLight: "#e8d9a5",
  head: "#9aa2ab", headDark: "#59616b", headLight: "#d6dce2",
  feather: "#d9d4c4", featherDark: "#8f8a78", binding: "#6e4f2c",
} as const;
/** O comprimento da flecha desenhada, em pixels: a ponta fica na frente do ponto de origem e as penas atrás. */
export const ARROW_LENGTH = 22;

/**
 * A flecha em voo (ADR 0112), no referencial da ponta: a origem é o centro da flecha e ela voa para +x (quem desenha gira e posiciona).
 * `progress` (0..1) é quanto do voo já foi: o rastro de vento se estica no começo e some perto do alvo. Sem sorteio, para a cena ser
 * reproduzível em teste e captura.
 */
export function drawArrowShot(ctx: CanvasRenderingContext2D, progress: number): void {
  const L = REED_ARROW_LOOK, p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const half = ARROW_LENGTH / 2, trail = 8 + 12 * Math.min(1, p * 3) * (1 - p * 0.6);
  // rastro de vento atrás das penas
  const wind = ctx.createLinearGradient(-half, 0, -half - trail, 0);
  wind.addColorStop(0, rgba(L.shaftLight, 0.55)); wind.addColorStop(1, rgba(L.shaftLight, 0));
  ctx.fillStyle = wind; ctx.beginPath(); ctx.moveTo(-half, -1.6); ctx.lineTo(-half - trail, 0); ctx.lineTo(-half, 1.6); ctx.closePath(); ctx.fill();
  // sombra da flecha no chão, deslocada para baixo
  ellipse(ctx, 0, 7, half * 0.85, 1.6, rgba("#0b1c17", 0.22));
  // haste: contorno, corpo e fio de luz
  ctx.lineCap = "round";
  ctx.strokeStyle = L.shaftDark; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-half + 2, 0); ctx.lineTo(half - 4, 0); ctx.stroke();
  ctx.strokeStyle = L.shaft; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-half + 2, 0); ctx.lineTo(half - 4, 0); ctx.stroke();
  ctx.strokeStyle = L.shaftLight; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-half + 3, -0.5); ctx.lineTo(half - 5, -0.5); ctx.stroke();
  // ponta de pedra: um triângulo com um lado claro
  ctx.fillStyle = L.headDark; ctx.beginPath(); ctx.moveTo(half + 1, 0); ctx.quadraticCurveTo(half - 3, -1.5, half - 6, -3); ctx.lineTo(half - 4.5, 0); ctx.lineTo(half - 6, 3); ctx.quadraticCurveTo(half - 3, 1.5, half + 1, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = L.head; ctx.beginPath(); ctx.moveTo(half, 0); ctx.quadraticCurveTo(half - 3, -1.3, half - 5.5, -2.4); ctx.lineTo(half - 4.5, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = L.headLight; ctx.beginPath(); ctx.moveTo(half - 1, -0.3); ctx.quadraticCurveTo(half - 2.8, -0.9, half - 4.5, -1.7); ctx.lineTo(half - 4.2, -0.3); ctx.closePath(); ctx.fill();
  // amarração da ponta
  ctx.strokeStyle = L.binding; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(half - 6.6, -1); ctx.lineTo(half - 6.6, 1); ctx.stroke();
  // penas: duas de cada lado, abertas para trás
  for (const side of [-1, 1]) {
    ctx.fillStyle = side < 0 ? L.feather : L.featherDark;
    ctx.beginPath(); ctx.moveTo(-half + 7, 0); ctx.quadraticCurveTo(-half + 3, side * 1.2, -half - 0.5, side * 3.4); ctx.lineTo(-half + 2.6, side * 3.4); ctx.quadraticCurveTo(-half + 6, side * 1.6, -half + 8.5, side * 0.4); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = L.binding; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-half + 8.6, -1); ctx.lineTo(-half + 8.6, 1); ctx.stroke();
  ctx.lineCap = "butt";
}
