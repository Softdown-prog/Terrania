/**
 * Peças físicas do subsolo: cada uma passa pelo contrato de arte como prop.
 * A planta 42×30 e o atlas são composições, mas cristais/raízes/pedras/escada NÃO.
 * Nenhuma regra de colisão ou geração de salas deve existir neste arquivo.
 */
import { ellipse, mix, rgba, shade, softShadow, TAU } from "./draw.ts";
import type { CaveTheme } from "../world/caves.ts";

export interface CavePalette {
  readonly ground: string;
  readonly light: string;
  readonly wall: string;
  readonly rim: string;
  readonly water: string;
  readonly accent: string;
}
export const CAVE_PALETTE: Record<CaveTheme, CavePalette> = {
  verdant: { ground:"#51604a",light:"#879270",wall:"#27382e",rim:"#607555",water:"#345a51",accent:"#b1d17d" },
  glacial: { ground:"#789da5",light:"#bcd9db",wall:"#355668",rim:"#a0ccdc",water:"#3a8396",accent:"#d9fcff" },
  desert: { ground:"#8c7458",light:"#d6b785",wall:"#594636",rim:"#bba078",water:"#6a7a65",accent:"#ead18e" },
  coastal: { ground:"#577b78",light:"#a4bfb0",wall:"#284e55",rim:"#74a5a0",water:"#307d90",accent:"#b0e9d9" },
  basalt: { ground:"#505660",light:"#8d9194",wall:"#222b32",rim:"#677682",water:"#36505c",accent:"#b5c0b9" },
  marsh: { ground:"#494f3d",light:"#89926b",wall:"#262c29",rim:"#637355",water:"#36594b",accent:"#afd887" },
};
const OUTLINE = "#142a2a";
const GLINT = "#fff6dc";

type Formation = "crystal" | "root" | "stone";
function formationFor(theme: CaveTheme): Formation {
  return theme === "glacial" || theme === "basalt" ? "crystal"
    : theme === "marsh" || theme === "verdant" ? "root" : "stone";
}
function formationOutline(ctx: CanvasRenderingContext2D, kind: Formation): void {
  ctx.beginPath();
  if (kind === "crystal") {
    ctx.moveTo(-7, 0);
    ctx.quadraticCurveTo(-7, -5, -4, -12);
    ctx.lineTo(1, -20);
    ctx.quadraticCurveTo(3, -19, 7, -10);
    ctx.lineTo(7, -2);
    ctx.quadraticCurveTo(6, 1, -7, 0);
  } else if (kind === "root") {
    ctx.moveTo(-8, 0);
    ctx.quadraticCurveTo(-9, -6, -5, -12);
    ctx.quadraticCurveTo(-1, -19, 1, -17);
    ctx.quadraticCurveTo(2, -9, 7, -11);
    ctx.quadraticCurveTo(8, -6, 6, 0);
  } else {
    ctx.moveTo(-10, 0);
    ctx.quadraticCurveTo(-12, -4, -7, -9);
    ctx.quadraticCurveTo(-2, -14, 3, -11);
    ctx.quadraticCurveTo(9, -10, 11, -3);
    ctx.quadraticCurveTo(10, 1, -10, 0);
  }
  ctx.closePath();
}

/** Sombra, silhueta, volume, veios recortados, nervuras, oclusão, contorno, facetas e brilho. */
export function drawCaveFormation(ctx: CanvasRenderingContext2D, theme: CaveTheme,
  sx: number, sy: number, variation = 0.5): void {
  const p = CAVE_PALETTE[theme];
  const kind = formationFor(theme);
  const v = Math.max(0, Math.min(1, Number.isFinite(variation) ? variation : 0.5));
  ctx.save();
  ctx.translate(sx, sy);
  // 1. Contato com o piso, limitado ao tamanho da formação.
  softShadow(ctx, 1, 1.5, 11, 3.1, .3);
  // 2-3. Corpo orgânico ou cristal mineral com luz superior esquerda.
  const volume = ctx.createLinearGradient(-11, -18, 10, 3);
  volume.addColorStop(0, mix(p.light, GLINT, .2));
  volume.addColorStop(.45, mix(p.rim, p.ground, .26 + v * .12));
  volume.addColorStop(1, shade(p.wall, -.2));
  formationOutline(ctx, kind);
  ctx.fillStyle = volume;
  ctx.fill();
  // 4. Material recortado no volume, nunca pintado fora da silhueta.
  ctx.save();
  formationOutline(ctx, kind);
  ctx.clip();
  for (let i = 0; i < 4; i++) {
    const dx = -7 + i * 4 + v * 1.5;
    ctx.lineWidth = .7 + i * .08;
    ctx.strokeStyle = rgba(shade(p.ground, -.28 + i * .16), .52);
    ctx.beginPath();
    ctx.moveTo(dx, -19);
    ctx.quadraticCurveTo(dx + (kind === "root" ? 4 : -2), -8, dx + 3, 2);
    ctx.stroke();
  }
  const facet = ctx.createLinearGradient(-8, -12, 7, 0);
  facet.addColorStop(0, rgba(p.light, .5));
  facet.addColorStop(.5, rgba(p.accent, .21));
  facet.addColorStop(1, rgba(shade(p.wall, -.1), .44));
  ctx.fillStyle = facet;
  ctx.beginPath();
  ctx.moveTo(-4, -17); ctx.quadraticCurveTo(0, -7, -1, -1);
  ctx.lineTo(4, -1); ctx.quadraticCurveTo(1, -12, -4, -17);
  ctx.fill();
  ctx.restore();
  // 5. Uma nervura secundária, com contorno/base/fio claro em três passadas.
  for (const [width, color] of [
    [3.3, OUTLINE], [2.1, p.rim], [.75, p.light],
  ] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(-4, -2);
    ctx.quadraticCurveTo(1 + v, -7, 4, -12);
    ctx.stroke();
  }
  // 6. Oclusão no ponto de contato, sem encobrir a silhueta inteira.
  ellipse(ctx, 0, .3, 8, 1.5, rgba(OUTLINE, .32));
  // 7. Contorno único da silhueta.
  formationOutline(ctx, kind);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.1;
  ctx.stroke();
  // 8. Pequena faceta/casca interna para indicar profundidade.
  ctx.strokeStyle = rgba(shade(p.wall, -.28), .55);
  ctx.lineWidth = .9;
  ctx.beginPath();
  ctx.moveTo(1, -15);
  ctx.quadraticCurveTo(4, -10, 3, -4);
  ctx.stroke();
  // 9. Reflexo sempre no quadrante superior esquerdo.
  ctx.strokeStyle = rgba(GLINT, .68);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-4.5, -12);
  ctx.quadraticCurveTo(-3, -17, -1.5, -17.5);
  ctx.stroke();
  ellipse(ctx, -4.3, -13, 1.2, .65, rgba(GLINT, .55));
  ctx.restore();
}

/** Escada de retorno, elemento físico auditado separadamente da planta/cartografia. */
export function drawCaveExitStair(ctx: CanvasRenderingContext2D, theme: CaveTheme,
  sx: number, sy: number): void {
  const p = CAVE_PALETTE[theme];
  ctx.save();
  ctx.translate(sx, sy);
  // 1. Sombra no chão; 2-3. silhueta e volume na borda de pedra.
  softShadow(ctx, 0, 8, 29, 11, .52);
  const aura = ctx.createRadialGradient(0, 0, 4, 0, 0, 49);
  aura.addColorStop(0, rgba(p.accent, .3));
  aura.addColorStop(1, rgba(p.accent, 0));
  ctx.fillStyle = aura;
  ctx.fillRect(-51, -51, 102, 102);
  const rim = ctx.createLinearGradient(-24, -14, 24, 13);
  rim.addColorStop(0, p.light);
  rim.addColorStop(.34, p.rim);
  rim.addColorStop(1, shade(p.wall, -.4));
  ellipse(ctx, 0, 0, 27, 16, rim);
  const depth = ctx.createLinearGradient(0, -11, 0, 13);
  depth.addColorStop(0, shade(p.wall, -.48));
  depth.addColorStop(1, OUTLINE);
  ellipse(ctx, 0, 1, 21, 10.5, OUTLINE);
  ellipse(ctx, 0, 1, 18.5, 8.3, depth);
  // 4. Recorte dos degraus no nicho, impedindo que atravessem a pedra.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 1, 18.5, 8.3, 0, 0, TAU);
  ctx.clip();
  // 5. Degraus: cada um tem sombra, pedra e fio de luz, em três passadas.
  for (let step = 0; step < 4; step++) {
    const y = -7 + step * 3.6, half = 8 + step * 2.3;
    ctx.fillStyle = rgba(OUTLINE, .78);
    ctx.fillRect(-half - .5, y, half * 2 + 1, 3.7);
    ctx.fillStyle = mix(p.rim, p.light, .24 + step * .15);
    ctx.fillRect(-half, y, half * 2, 2.5);
    ctx.fillStyle = rgba(GLINT, .4);
    ctx.fillRect(-half, y, half * 2, .8);
  }
  ctx.restore();
  // 6. Oclusão onde o túnel encontra o aro.
  ctx.strokeStyle = rgba(OUTLINE, .63);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 1, 22, 11, 0, 0, TAU);
  ctx.stroke();
  // 7. Contorno escuro externo da peça.
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, 27, 16, 0, 0, TAU);
  ctx.stroke();
  // 8. Profundidade do aro interno.
  ctx.strokeStyle = rgba(p.rim, .65);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, 1, 20, 9.5, 0, 0, TAU);
  ctx.stroke();
  // 9. Reflexo especular na borda superior esquerda.
  ctx.strokeStyle = rgba(GLINT, .72);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(-1, -1, 24, 13, 0, Math.PI, TAU * .97);
  ctx.stroke();
  ellipse(ctx, -17, -9, 2, .75, rgba(GLINT, .48));
  ctx.restore();
}


/**
 * A face de rocha é uma peça de 32px que acompanha a borda do terreno.
 * A silhueta se conecta nas pontas, mas é irregular no meio; não desenha
 * grade nem modifica passabilidade. Orientação leste gira o mesmo relevo.
 */
export function drawCaveWallFace(ctx: CanvasRenderingContext2D, theme: CaveTheme,
  sx: number, sy: number, side: "south" | "east" = "south", variation = .5): void {
  const p = CAVE_PALETTE[theme];
  const v = Math.max(0, Math.min(1, Number.isFinite(variation) ? variation : .5));
  const outline = (): void => {
    const ripple = (v - .5) * 3;
    ctx.beginPath();
    ctx.moveTo(-16.5, -4);
    ctx.quadraticCurveTo(-13, -8 + ripple, -8, -6);
    ctx.quadraticCurveTo(-3, -9 - ripple, 1, -7 + ripple);
    ctx.quadraticCurveTo(7, -4 - ripple, 10, -6);
    ctx.quadraticCurveTo(14, -6 + ripple, 16.5, -4);
    ctx.lineTo(16.5, 2);
    ctx.quadraticCurveTo(5, 2.8, -2, 1.6);
    ctx.quadraticCurveTo(-10, 2.4, -16.5, 2);
    ctx.closePath();
  };
  ctx.save();
  ctx.translate(sx, sy);
  if (side === "east") ctx.rotate(-Math.PI / 2);
  // 1. Contato e oclusão projetados do lado transitável.
  softShadow(ctx, 0, 1, 18, 3.8, .24);
  // 2. Silhueta de basalto/terra talhada em curva, não um retângulo com borda reta.
  // 3. Faceta de volume em três tons com luz superior esquerda.
  const stone = ctx.createLinearGradient(-11, -9, 9, 3);
  stone.addColorStop(0, mix(p.light, GLINT, .18));
  stone.addColorStop(.4, p.rim);
  stone.addColorStop(1, shade(p.wall, -.24));
  outline();
  ctx.fillStyle = stone;
  ctx.fill();
  // 4. Material recortado pela borda irregular.
  ctx.save();
  outline();
  ctx.clip();
  for (let i = 0; i < 4; i++) {
    const x = -14 + i * 9 + v * 2;
    ctx.strokeStyle = rgba(shade(p.ground, -.32 + i * .12), .55);
    ctx.lineWidth = .65 + i * .12;
    ctx.beginPath();
    ctx.moveTo(x - 3, -8);
    ctx.quadraticCurveTo(x + 1, -1, x + 5, 5);
    ctx.stroke();
  }
  const cut = ctx.createLinearGradient(0, -7, 0, 3);
  cut.addColorStop(0, rgba(p.light, .35));
  cut.addColorStop(1, rgba(p.wall, .52));
  ctx.fillStyle = cut;
  ctx.beginPath();
  ctx.moveTo(-5, -5);
  ctx.quadraticCurveTo(3, -8 + v * 2, 9, -3);
  ctx.lineTo(6, 1);
  ctx.quadraticCurveTo(2, -2, -5, -5);
  ctx.fill();
  ctx.restore();
  // 5. Fenda mineral com 3 passadas, seguindo a mesma curvatura.
  for (const [width, color] of [[2.7, OUTLINE], [1.65, p.ground], [.65, p.light]] as const) {
    ctx.lineWidth = width; ctx.strokeStyle = color;
    ctx.beginPath(); ctx.moveTo(-14, -1);
    ctx.quadraticCurveTo(-4, 1.4 + v, 6, -1);
    ctx.quadraticCurveTo(11, -2.4, 14, -1);
    ctx.stroke();
  }
  // 6. Oclusão ambiente entre a rocha e o espaço aberto.
  ctx.strokeStyle = rgba(OUTLINE, .52); ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(-15, 2); ctx.quadraticCurveTo(1, 3, 15, 2); ctx.stroke();
  // 7. Contorno externo escuro separa rocha e piso.
  outline(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.05; ctx.stroke();
  // 8. Lascas internas tornam a parede espessa, não uma linha sintética.
  ellipse(ctx, -8 + v * 3, -3, 2.2, .9, rgba(p.accent, .36));
  ellipse(ctx, 6, -4, 2.9, .85, rgba(shade(p.rim, -.17), .42));
  // 9. Reflexos discretos somente no bordo esquerdo superior.
  ctx.strokeStyle = rgba(GLINT, .59); ctx.lineWidth = .8;
  ctx.beginPath(); ctx.moveTo(-15, -4.7);
  ctx.quadraticCurveTo(-12, -8 + v, -8, -6.7); ctx.stroke();
  ellipse(ctx, -10, -6.1, 1.3, .55, rgba(GLINT, .47));
  ctx.restore();
}
