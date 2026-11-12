/**
 * Agendador de pré-geração de chunks (ADR 0047). Puro: dado onde está a câmera, para onde ela anda e o que já está no cache,
 * diz quais chunks gerar antes de aparecerem, do mais urgente para o menos. Quem gera é o `WorldRenderer`.
 */
export interface PrefetchView {
  readonly cameraX: number; readonly cameraY: number;
  readonly width: number; readonly height: number;
  /** Velocidade da câmera em px/s (0, 0 parado). */
  readonly velocityX: number; readonly velocityY: number;
}
export interface PrefetchLimits {
  /** Lado de um chunk em px. */
  readonly chunkPixels: number;
  /** Quantos chunks cabem no cache. */
  readonly capacity: number;
  /** Chunks que devem sobrar livres no cache, para a tela inteira e o que a câmera ainda vai pedir não se atropelarem. */
  readonly slack: number;
  /** Quanto à frente, em segundos, se olha: o ponto onde a câmera estará. */
  readonly lookaheadSeconds: number;
  /** Velocidade abaixo da qual a câmera conta como parada (px/s). */
  readonly stillSpeed: number;
}
export const PREFETCH_LIMITS: Omit<PrefetchLimits, "chunkPixels" | "capacity"> = { slack: 2, lookaheadSeconds: 0.9, stillSpeed: 4 };

const chunkOf = (value: number, size: number): number => Math.floor(value / size);

/** Chunks que a tela mostra agora (a mesma conta do `WorldRenderer.render`). */
export function visibleChunks(view: PrefetchView, chunkPixels: number): Array<readonly [number, number]> {
  const left = view.cameraX - view.width / 2, top = view.cameraY - view.height / 2, out: Array<readonly [number, number]> = [];
  for (let cy = chunkOf(top, chunkPixels); cy <= chunkOf(top + view.height, chunkPixels); cy++)
    for (let cx = chunkOf(left, chunkPixels); cx <= chunkOf(left + view.width, chunkPixels); cx++) out.push([cx, cy]);
  return out;
}

/**
 * Os chunks a pré-gerar, do mais urgente ao menos. São os vizinhos da tela (uma volta em torno dela) que ainda não estão
 * no cache, ordenados pela distância até o ponto onde a câmera estará daqui a `lookaheadSeconds`, e cortados para nunca
 * passar do que o cache aguenta (capacidade menos a folga menos o que a tela já usa), para a pré-geração não expulsar
 * o que está na tela. Câmera parada ou valores inválidos: lista vazia só se não houver o que fazer; nunca lança.
 */
export function prefetchPlan(view: PrefetchView, limits: PrefetchLimits, cached: (cx: number, cy: number) => boolean): Array<readonly [number, number]> {
  const numbers = [view.cameraX, view.cameraY, view.width, view.height, view.velocityX, view.velocityY, limits.chunkPixels, limits.capacity];
  if (!numbers.every(Number.isFinite) || view.width <= 0 || view.height <= 0 || limits.chunkPixels <= 0) return [];
  const visible = visibleChunks(view, limits.chunkPixels), room = limits.capacity - limits.slack - visible.length;
  if (room <= 0) return [];
  const speed = Math.hypot(view.velocityX, view.velocityY), moving = speed >= limits.stillSpeed;
  const ahead = { x: view.cameraX + (moving ? view.velocityX * limits.lookaheadSeconds : 0), y: view.cameraY + (moving ? view.velocityY * limits.lookaheadSeconds : 0) };
  const seen = new Set(visible.map(([cx, cy]) => cx + "," + cy));
  const x0 = Math.min(...visible.map(c => c[0])) - 1, x1 = Math.max(...visible.map(c => c[0])) + 1;
  const y0 = Math.min(...visible.map(c => c[1])) - 1, y1 = Math.max(...visible.map(c => c[1])) + 1;
  const ring: Array<{ cx: number; cy: number; d: number }> = [];
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
    if (seen.has(cx + "," + cy)) continue;
    const mx = (cx + 0.5) * limits.chunkPixels, my = (cy + 0.5) * limits.chunkPixels;
    ring.push({ cx, cy, d: Math.hypot(mx - ahead.x, my - ahead.y) });
  }
  ring.sort((a, b) => a.d - b.d || a.cy - b.cy || a.cx - b.cx);
  return ring.slice(0, room).filter(c => !cached(c.cx, c.cy)).map(c => [c.cx, c.cy] as const);
}
