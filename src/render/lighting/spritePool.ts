/**
 * Telas de rascunho e cache de quadros prontos da luz comum. As telas de rascunho são reaproveitadas (nada de alocar a cada quadro); o cache guarda os últimos
 * quadros já iluminados por chave (criatura, pose e escala), com teto fixo, e devolve as telas mais antigas ao reservatório em vez de largá-las para o coletor.
 */
export type Surface = HTMLCanvasElement;

/** Quantos quadros prontos o cache guarda, no máximo, e o teto de pixels de todos juntos (cerca de 40 MB): o que bater primeiro limita. Cabe em celular de 2018. */
export const FRAME_CACHE_MAX = 64;
export const FRAME_CACHE_PIXELS = 10_000_000;

const scratch = new Map<string, Surface>();
const free: Surface[] = [];
const frames = new Map<string, Surface>();
let pixels = 0;
const area = (canvas: Surface): number => canvas.width * canvas.height;

const make = (width: number, height: number): Surface => {
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  return canvas;
};
const fit = (canvas: Surface, width: number, height: number): Surface => {
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  return canvas;
};

/** Uma tela de rascunho com o nome dado, do tamanho pedido e limpa. */
export function scratchSurface(name: string, width: number, height: number): Surface {
  const canvas = fit(scratch.get(name) ?? make(width, height), width, height);
  scratch.set(name, canvas);
  const ctx = canvas.getContext("2d");
  if (ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowColor = "rgba(0,0,0,0)"; ctx.clearRect(0, 0, width, height); }
  return canvas;
}

export const cachedFrame = (key: string): Surface | undefined => {
  const hit = frames.get(key);
  if (hit) { frames.delete(key); frames.set(key, hit); }
  return hit;
};

/** Uma tela para o próximo quadro pronto: a mais antiga devolvida pelo cache, se couber, ou uma nova. */
export const frameSurface = (width: number, height: number): Surface => fit(free.pop() ?? make(width, height), width, height);

export function storeFrame(key: string, frame: Surface): void {
  frames.set(key, frame); pixels += area(frame);
  while (frames.size > FRAME_CACHE_MAX || (pixels > FRAME_CACHE_PIXELS && frames.size > 1)) {
    const oldest = frames.keys().next().value;
    if (oldest === undefined) break;
    const gone = frames.get(oldest);
    frames.delete(oldest);
    if (gone) { pixels -= area(gone); free.push(gone); }
  }
}

/** Quantos quadros prontos o cache tem agora e quantas telas esperam reaproveitamento (para os testes). */
export const poolStats = (): { frames: number; free: number; pixels: number } => ({ frames: frames.size, free: free.length, pixels });
export function resetPool(): void { scratch.clear(); free.length = 0; frames.clear(); pixels = 0; }
