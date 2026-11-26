import { LIGHT, type LightRig, type SpriteBox } from "./lightRig.ts";
import { scratchSurface, type Surface } from "./spritePool.ts";

/** A camada de luz é calculada em metade da resolução do sprite: ela é macia por natureza e custa um quarto dos pixels. O desenho em si continua inteiro. */
export const LIGHT_DOWNSCALE = 2;

/** Copia `source` para uma tela `name` menor (a média dos pixels vizinhos: a silhueta já sai suave, sem desfoque caro). */
function shrunk(name: string, source: Surface, width: number, height: number): Surface {
  const out = scratchSurface(name, width, height);
  out.getContext("2d")!.drawImage(source, 0, 0, source.width, source.height, 0, 0, width, height);
  return out;
}

/** A faixa de `silhouette` que sobra quando se tira a própria silhueta deslocada em (dx, dy): a borda do lado oposto ao deslocamento, pintada da cor dada. */
function band(silhouette: Surface, dx: number, dy: number, color: string): Surface {
  const out = scratchSurface("band", silhouette.width, silhouette.height), ctx = out.getContext("2d")!;
  ctx.drawImage(silhouette, 0, 0);
  ctx.globalCompositeOperation = "destination-out"; ctx.drawImage(silhouette, dx, dy);
  ctx.globalCompositeOperation = "source-in"; ctx.fillStyle = color; ctx.fillRect(0, 0, silhouette.width, silhouette.height);
  return out;
}

/**
 * A luz comum sobre um sprite já desenhado: copia `source` para `out` e põe por cima, só dentro da silhueta, a camada de luz do `LightRig`: contorno interno
 * escurecido (volume), degradê grande da luz, quinas iluminadas e quinas na sombra, oclusão junto ao chão e brilho de material. As camadas são pintadas todas
 * juntas numa tela de meia resolução e entram de uma vez (`source-atop`). `scale` é pixels por unidade do mundo; `box` é a caixa do sprite (a origem é os pés).
 */
export function relightSprite(source: Surface, out: Surface, box: SpriteBox, scale: number, rig: LightRig = LIGHT): void {
  const octx = out.getContext("2d")!, k = LIGHT_DOWNSCALE;
  octx.globalCompositeOperation = "source-over"; octx.drawImage(source, 0, 0);
  const lw = Math.max(1, Math.ceil(source.width / k)), lh = Math.max(1, Math.ceil(source.height / k)), unit = scale / k;
  const silhouette = shrunk("silhouette", source, lw, lh);
  const light = scratchSurface("light", lw, lh), lctx = light.getContext("2d")!;
  // 1) contorno interno escurecido: tudo o que está longe do miolo da silhueta (a silhueta ainda mais encolhida e esticada de volta é o miolo macio)
  const soft = Math.max(2, Math.round(rig.edge.blur * unit)), tinyW = Math.max(1, Math.ceil(lw / soft)), tinyH = Math.max(1, Math.ceil(lh / soft));
  const tiny = shrunk("tiny", silhouette, tinyW, tinyH);
  lctx.fillStyle = rig.edge.color; lctx.fillRect(0, 0, lw, lh);
  lctx.globalCompositeOperation = "destination-out"; lctx.drawImage(tiny, 0, 0, tinyW, tinyH, 0, 0, lw, lh);
  lctx.globalCompositeOperation = "source-over";
  // 2) o degradê grande da luz: quente de onde ela vem, frio para o lado oposto
  const g = lctx.createLinearGradient(lw * (.5 + rig.from.x * .3), lh * (.5 + rig.from.y * .45), lw * (.5 - rig.from.x * .3), lh * (.5 - rig.from.y * .45));
  g.addColorStop(0, rig.key.light); g.addColorStop(.45, "rgba(255,244,214,0)"); g.addColorStop(1, rig.key.shade);
  lctx.fillStyle = g; lctx.fillRect(0, 0, lw, lh);
  // 3) quinas: a faixa voltada para a luz brilha e a oposta escurece
  const rim = Math.max(1, rig.rimWidth * unit), dx = rig.from.x * -rim, dy = rig.from.y * -rim;
  lctx.drawImage(band(silhouette, dx, dy, rig.rim.light), 0, 0);
  lctx.drawImage(band(silhouette, -dx, -dy, rig.rim.shade), 0, 0);
  // 4) oclusão junto ao chão: escurece de baixo, onde a criatura toca a terra (a origem do desenho é os pés)
  const feet = -box.top * unit, ao = lctx.createLinearGradient(0, feet - rig.ground.height * unit * 1.6, 0, feet);
  ao.addColorStop(0, "rgba(0,0,0,0)"); ao.addColorStop(1, rig.ground.color);
  lctx.fillStyle = ao; lctx.fillRect(0, 0, lw, lh);
  // 5) brilho suave de material no alto, do lado da luz
  const cx = lw * rig.sheen.x, cy = lh * rig.sheen.y, sheen = lctx.createRadialGradient(cx, cy, 1, cx, cy, lw * rig.sheen.radius);
  sheen.addColorStop(0, rig.sheen.color); sheen.addColorStop(1, "rgba(255,255,240,0)");
  lctx.fillStyle = sheen; lctx.fillRect(0, 0, lw, lh);
  octx.save(); octx.globalCompositeOperation = "source-atop";
  octx.drawImage(light, 0, 0, lw, lh, 0, 0, source.width, source.height);
  octx.restore();
}
