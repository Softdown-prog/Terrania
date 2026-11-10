import { ellipse, rgba, shade, softShadow } from "./draw.ts";
import type { CoinId } from "../engine/character/coins/index.ts";

/**
 * Moedas no chão (ADR 0024), peça física auditada como `prop`: um montinho de três moedas com
 * espessura, brilho pulsante e um reflexo que passa de tempos em tempos. A moeda do montinho é a
 * maior que o valor forma (ouro, cripta ou coroa). Origem em (x, y) = contato com o chão; luz de
 * cima à esquerda.
 */
const OUTLINE = "#142a2a";
const GLINT = "#fff6dc";
const LOOKS: Readonly<Record<CoinId, { face: string; light: string; rim: string; mark: string; glow: string }>> = {
  "terrania-gold": { face: "#e0a24a", light: "#f6cd72", rim: "#a8691d", mark: "#8a5a1e", glow: "#ffd98a" },
  "cripta-coin": { face: "#7a66d8", light: "#a898ee", rim: "#3d2f8a", mark: "#251c5c", glow: "#b9a8ff" },
  "eclipse-crown": { face: "#2a2038", light: "#4a3c63", rim: "#ffc861", mark: "#ffe29a", glow: "#ffcf7a" },
};

export function renderCoinDrop(ctx: CanvasRenderingContext2D, tier: CoinId, x: number, y: number, time: number): void {
  const look = LOOKS[tier];
  const bob = Math.sin(time * 2.4 + x * .02) * 1.4;
  const pulse = .5 + .5 * Math.sin(time * 3 + x * .03);
  ctx.save();
  ctx.translate(x, y);
  // 1. Contato: sombra no chão sob o montinho.
  softShadow(ctx, 0, 3, 11, 3.2, .38);
  // 2. Halo pulsante para a moeda ser vista de longe.
  const halo = ctx.createRadialGradient(0, -6 + bob, 1, 0, -6 + bob, 17);
  halo.addColorStop(0, rgba(look.glow, .32 + pulse * .2));
  halo.addColorStop(1, rgba(look.glow, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(-18, -24 + bob, 36, 36);
  // 3-7. As três moedas, de trás para a frente: borda grossa, face com gradiente, aro e marca.
  const coins = [[-5, -1.5, -.18], [4.6, -.5, .22], [0, -6 + bob * .5, .04]] as const;
  for (const [cx, cy, tilt] of coins) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tilt);
    ellipse(ctx, 0, 2.4, 7.4, 4.3, shade(look.rim, -.28));
    const face = ctx.createLinearGradient(-6, -4, 6, 4);
    face.addColorStop(0, look.light);
    face.addColorStop(.5, look.face);
    face.addColorStop(1, shade(look.face, -.3));
    ellipse(ctx, 0, 0, 7.2, 4.2, face);
    ctx.strokeStyle = look.rim; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, 0, 5.2, 2.9, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = look.mark; ctx.lineWidth = 1.1;
    ctx.beginPath();
    if (tier === "terrania-gold") { ctx.moveTo(-2, -1.1); ctx.lineTo(2, -1.1); ctx.moveTo(0, -1.1); ctx.lineTo(0, 1.6); }
    else if (tier === "cripta-coin") { ctx.moveTo(-1.8, 1.5); ctx.lineTo(-1.8, -.4); ctx.quadraticCurveTo(0, -2.4, 1.8, -.4); ctx.lineTo(1.8, 1.5); }
    else { ctx.moveTo(-2.2, 1.2); ctx.lineTo(-1.8, -1.2); ctx.lineTo(-.6, .2); ctx.lineTo(0, -1.6); ctx.lineTo(.6, .2); ctx.lineTo(1.8, -1.2); ctx.lineTo(2.2, 1.2); }
    ctx.stroke();
    // 8. Contorno único da moeda.
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(0, 0, 7.2, 4.2, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  // 9. Brilho no alto da moeda da frente e reflexo que passa de tempos em tempos, por último.
  ctx.strokeStyle = rgba(GLINT, .75); ctx.lineWidth = .9;
  ctx.beginPath(); ctx.moveTo(-5, -8.4 + bob * .5); ctx.quadraticCurveTo(-2, -10, 1.6, -9.2 + bob * .5); ctx.stroke();
  const sweep = (time * .6 + x * .01) % 1;
  if (sweep < .22) {
    const alpha = Math.sin(sweep / .22 * Math.PI);
    ellipse(ctx, -2 + sweep * 26, -7 + bob * .5, 1.1, 2.4, rgba(GLINT, alpha * .9));
  }
  ctx.restore();
}

/** A moeda do desenho: a maior que o valor forma (100 ou mais é cripta; 10.000 ou mais é coroa). */
export function coinDropTier(amount: number): CoinId {
  return amount >= 10_000 ? "eclipse-crown" : amount >= 100 ? "cripta-coin" : "terrania-gold";
}
