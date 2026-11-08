/**
 * PEÇA DE REFERÊNCIA do contrato de arte procedural (docs/CONTRATO_ARTE_PROCEDURAL.md).
 * Não é usada no jogo: serve de modelo de acabamento para qualquer desenho novo e é auditada
 * em tests/art-contract.test.ts. Copie a ESTRUTURA (camadas e ordem), não os números.
 */
import { ellipse, hashString, limb, rgba, shade, softShadow, TAU } from "../draw.ts";

/** Cada material tem rampa de três tons: luz, base e sombra. A luz vem da esquerda e de cima. */
const WOOD = { light: "#b98255", base: "#8a5e3b", dark: "#5a3a24" } as const;
const IRON = { light: "#dfe7e6", base: "#8e9aa0", dark: "#4c5a62" } as const;
const OUTLINE = "#142a2a";
const GLINT = "#fff6dc";

const HEIGHT = 27;
const BELLY = 13;
const TOP_HALF = 9;

/**
 * Barril de madeira com dois aros de ferro. Origem em (sx, sy) = ponto de contato com o chão.
 * Sem Math.random: a variação de cada barril vem de `seed`, então o mesmo id sempre sai igual.
 */
export function renderBarrelReference(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  seed = "barrel",
  faded = false,
): void {
  const r = hashString(seed);
  ctx.save();
  ctx.translate(sx, sy);
  if (faded) ctx.globalAlpha = 0.36;

  // 1. Sombra de contato: ancora a peça no chão antes de qualquer forma.
  softShadow(ctx, 1, 1, 15, 5, 0.34);
  ctx.rotate((r - 0.5) * 0.06);

  // 2. Silhueta: formas orgânicas com curvas (o barril é mais largo no meio).
  const body = (): void => {
    ctx.beginPath();
    ctx.moveTo(-TOP_HALF, -1);
    ctx.quadraticCurveTo(-BELLY, -HEIGHT / 2, -TOP_HALF, -HEIGHT);
    ctx.lineTo(TOP_HALF, -HEIGHT);
    ctx.quadraticCurveTo(BELLY, -HEIGHT / 2, TOP_HALF, -1);
    ctx.closePath();
  };

  // 3. Volume: gradiente luz → base → sombra atravessando a forma.
  const volume = ctx.createLinearGradient(-BELLY, 0, BELLY, 0);
  volume.addColorStop(0, WOOD.light);
  volume.addColorStop(0.45, WOOD.base);
  volume.addColorStop(1, WOOD.dark);
  body();
  ctx.fillStyle = volume;
  ctx.fill();

  // 4. Detalhe de material, recortado na silhueta: tábuas com tom próprio e frestas.
  ctx.save();
  body();
  ctx.clip();
  const planks = 6;
  const width = (TOP_HALF * 2) / planks;
  for (let i = 0; i < planks; i++) {
    const x = -TOP_HALF + i * width;
    const variation = (hashString(seed + ":" + i) - 0.5) * 0.18;
    ctx.fillStyle = rgba(shade(WOOD.base, variation), 0.5);
    ctx.fillRect(x, -HEIGHT, width, HEIGHT);
    ctx.strokeStyle = rgba(WOOD.dark, 0.6);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x, -HEIGHT);
    ctx.quadraticCurveTo(x * 1.32, -HEIGHT / 2, x, -1);
    ctx.stroke();
  }
  // 5. Aros de ferro: contorno, base e fio de luz (três passadas por peça com acabamento).
  for (const y of [-6, -21]) {
    for (const [width, color] of [[3, OUTLINE], [2, IRON.base], [0.7, IRON.light]] as const) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(-BELLY, y);
      ctx.quadraticCurveTo(0, y + 2.4, BELLY, y);
      ctx.stroke();
    }
  }
  // 6. Oclusão ambiente: escurece a base e a borda oposta à luz.
  ellipse(ctx, 0, -1.2, TOP_HALF + 1, 2.4, rgba(OUTLINE, 0.38));
  ctx.restore();

  // 7. Contorno escuro único: separa a peça de qualquer fundo.
  body();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.3;
  ctx.stroke();

  // 8. Tampa vista de cima: elipse com anel interno, para ler a profundidade.
  ellipse(ctx, 0, -HEIGHT, TOP_HALF + 0.4, 3.6, OUTLINE);
  ellipse(ctx, 0, -HEIGHT - 0.4, TOP_HALF - 0.6, 3, WOOD.base);
  ctx.strokeStyle = rgba(WOOD.dark, 0.7);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(0, -HEIGHT - 0.4, TOP_HALF - 3, 1.5, 0, 0, TAU);
  ctx.stroke();

  // 9. Brilho especular: sempre por último e no lado da luz.
  limb(ctx, -6.4, -23, -7.4, -9, 1.6, rgba(GLINT, 0.36));
  ellipse(ctx, -4.4, -HEIGHT - 1.2, 2.4, 0.8, rgba(GLINT, 0.55));

  ctx.restore();
}
