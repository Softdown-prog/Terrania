import { ellipse, rgba } from "../../../draw.ts";
import { MAGE_PAL as P } from "../palette.ts";
import { APPRENTICE_THEME, type MageSetTheme } from "../sets/index.ts";

/**
 * O livro de magias do Mago (ADR 0078), o escudo dele: preso na mão livre, de capa azul-violeta com o selo dourado de uma estrela, lombada escura,
 * miolo de páginas à mostra e um fecho. Acompanha a oscilação do braço como o escudo do Cavaleiro. `x, y` é a mão; `side` o lado dela.
 */
export function drawMageBook(ctx: CanvasRenderingContext2D, x: number, y: number, side: number, swing: number, tone: (c: string) => string, t: MageSetTheme = APPRENTICE_THEME): void {
  ctx.save();
  ctx.translate(x + side * 1.2, y - 2.4);
  ctx.rotate(side * (0.12 + swing * 0.03));
  // páginas à mostra por baixo e à direita da capa
  ctx.fillStyle = tone(t.book.page); ctx.strokeStyle = rgba(P.outline, 0.6); ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.roundRect(-4.4, -6.6, 9.2, 13.4, 1); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = rgba("#a9a48c", 0.9); ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(-3.8, 6.1); ctx.lineTo(4.2, 6.1); ctx.moveTo(-3.8, 5.3); ctx.lineTo(4.2, 5.3); ctx.stroke();
  // capa
  const cover = ctx.createLinearGradient(-5, -7, 5, 7);
  cover.addColorStop(0, tone(t.book.cover.light)); cover.addColorStop(0.5, tone(t.book.cover.mid)); cover.addColorStop(1, tone(t.book.cover.dark));
  ctx.fillStyle = cover; ctx.strokeStyle = rgba(P.outline, 0.7); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(-5.2, -7.4, 9.6, 13.4, 1.2); ctx.fill(); ctx.stroke();
  // lombada, cantoneiras e fecho de ouro
  ctx.fillStyle = tone(t.book.cover.dark); ctx.fillRect(-5.2, -7.4, 1.8, 13.4);
  ctx.strokeStyle = tone(t.trim); ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(-3.4, -6.6); ctx.lineTo(3.6, -6.6); ctx.moveTo(-3.4, 5.2); ctx.lineTo(3.6, 5.2); ctx.stroke();
  ctx.fillStyle = tone(t.trim); ctx.fillRect(3.4, -1.2, 1.5, 2.6);
  // o selo da capa: a estrela do Aprendiz ou o redemoinho de vento da Brisa
  if (t.motif === "wind") {
    ctx.strokeStyle = tone(t.trim); ctx.lineWidth = 0.9; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-2.6, 1.2); ctx.bezierCurveTo(-1.8, -2.8, 2.6, -3, 2.9, -0.2);
    ctx.moveTo(-1.8, 2.6); ctx.bezierCurveTo(-0.4, 3.6, 2.4, 3.2, 3, 1.4);
    ctx.moveTo(-1.2, -0.2); ctx.bezierCurveTo(-0.2, -1.4, 1.2, -1.2, 1.2, -0.2);
    ctx.stroke(); ctx.lineCap = "butt";
  } else {
    ctx.fillStyle = tone(t.trim);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 === 0 ? 2.7 : 1.15;
      if (i === 0) ctx.moveTo(0.4 + Math.cos(a) * r, -0.6 + Math.sin(a) * r); else ctx.lineTo(0.4 + Math.cos(a) * r, -0.6 + Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
  }
  ellipse(ctx, 0.4, -0.6, 0.55, 0.55, tone(t.gem));
  ellipse(ctx, -2, -4.6, 0.8, 0.5, rgba(P.spark, 0.5));
  // a fita marcadora que pende do livro
  ctx.strokeStyle = tone(t.book.ribbon); ctx.lineWidth = 1.1; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(1.8, 6); ctx.quadraticCurveTo(2.6, 8.4, 1.6, 9.6); ctx.quadraticCurveTo(1.2, 10.2, 2, 10.8); ctx.stroke(); ctx.lineCap = "butt";
  ctx.restore();
}
