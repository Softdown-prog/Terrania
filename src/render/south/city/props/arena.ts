import { ellipse, rgba } from "../../../draw.ts";
import { noise } from "../../kit/index.ts";
import { BuildingKit } from "../buildings/kit.ts";
import { BONE, BRONZE, CLAY, GLINT, OUTLINE, SAND, STONE, WINE } from "../buildings/palette.ts";

/**
 * Arena de lagartos da cidade (ADR 0050): arquibancada de barro em degraus que cerca o picadeiro de areia, com o piso riscado
 * por rastros de patas, um portão escuro de entrada, bandeiras vinho nos mastros e as pontas de osso na borda. Vista do alto e
 * de frente: os degraus de trás sobem, os da frente descem.
 */
export function paintCityArena(c: CanvasRenderingContext2D): void {
  const k = new BuildingKit(c), b = k.b;
  ellipse(c, 6, 8, 98, 58, "rgba(34,26,43,0.34)");
  // três degraus da arquibancada (de fora para dentro), cada um um anel de barro mais claro
  for (const [rx, ry, y, ramp] of [[94, 59, 0, CLAY], [86, 52, -4, CLAY], [78, 45, -7, { light: "#d98b5b", base: "#c98a5a", dark: "#a8683e" }]] as const) {
    c.fillStyle = b.gradient(-rx, rx, ramp); c.beginPath(); c.ellipse(0, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = OUTLINE; c.lineWidth = 1; c.stroke();
  }
  // as fileiras de assentos: blocos pequenos em arco, mais densos nos degraus de cima
  for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 26 + ring * 4; i++) {
    const a = (i / (26 + ring * 4)) * Math.PI * 2, rx = 90 - ring * 8, ry = 55 - ring * 7;
    const x = Math.cos(a) * rx, y = -3 - ring * 3 + Math.sin(a) * ry;
    c.fillStyle = noise(i, ring, 301) > 0.5 ? CLAY.light : CLAY.base; c.fillRect(x - 2.4, y - 1.6, 4.8, 3.2);
  }
  // picadeiro de areia com o brilho no centro e os rastros de patas
  const pit = c.createRadialGradient(-12, -16, 4, 0, -6, 76);
  pit.addColorStop(0, SAND.light); pit.addColorStop(0.7, SAND.base); pit.addColorStop(1, SAND.dark);
  c.fillStyle = pit; c.beginPath(); c.ellipse(0, -6, 66, 35, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = OUTLINE; c.lineWidth = 1; c.stroke();
  for (let i = 0; i < 14; i++) {
    const x = -48 + noise(i, 2, 303) * 96, y = -16 + noise(i, 3, 305) * 22;
    for (let p = 0; p < 3; p++) ellipse(c, x + p * 4, y + (p % 2) * 1.4, 1.4, 0.9, rgba(SAND.dark, 0.5));
  }
  c.beginPath(); c.ellipse(0, -6, 40, 20, 0, Math.PI * 0.1, Math.PI * 0.9); c.strokeStyle = rgba(SAND.dark, 0.5); c.lineWidth = 1.4; c.stroke();
  // borda de osso e pedra em volta do picadeiro
  c.beginPath(); c.ellipse(0, -5, 71, 39, 0, 0, Math.PI * 2); c.strokeStyle = BONE.base; c.lineWidth = 3.6; c.stroke();
  c.beginPath(); c.ellipse(0, -5, 71, 39, 0, Math.PI * 1.05, Math.PI * 1.7); c.strokeStyle = rgba(GLINT, 0.7); c.lineWidth = 1; c.stroke();
  // portão de entrada na frente: arco escuro com a grade
  c.fillStyle = "#171210"; c.beginPath(); c.moveTo(-9, 30); c.lineTo(-9, 20); c.arc(0, 20, 9, Math.PI, 0); c.lineTo(9, 30); c.closePath(); c.fill();
  c.strokeStyle = OUTLINE; c.lineWidth = 1; c.stroke();
  for (const x of [-5, 0, 5]) b.line([[x, 12], [x, 30]], "#3b3f46", 1.3);
  // mastros com bandeira vinho nas quatro quinas
  for (const [x, y] of [[-80, -22], [80, -22], [-58, 28], [58, 28]] as const) {
    b.line([[x, y], [x, y - 26]], "#8a5e3b", 1.8);
    b.poly([[x, y - 26], [x + 12, y - 23], [x + 10, y - 19], [x + 12, y - 15], [x, y - 17]]); c.fillStyle = b.gradient(x, x + 12, WINE); c.fill();
    c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.stroke();
    ellipse(c, x, y - 27, 1.8, 1.8, BRONZE.base);
  }
  // pontas de osso e pedra espaçadas na borda de fora
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.2, x = Math.cos(a) * 92, y = Math.sin(a) * 56;
    c.fillStyle = b.gradient(x - 3, x + 3, i % 2 ? BONE : STONE); c.fillRect(x - 3, y - 8, 6, 8);
    c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.strokeRect(x - 3, y - 8, 6, 8);
  }
  k.skull(0, 36, 1.1);
  b.drift(-70, 40, 16, 3, 1); b.drift(70, 42, 15, 3, 2);
}
