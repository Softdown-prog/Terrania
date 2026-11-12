import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PREFETCH_LIMITS, prefetchPlan, visibleChunks, type PrefetchLimits, type PrefetchView } from "../src/render/chunkPrefetch.ts";
import { WorldRenderer } from "../src/render/WorldRenderer.ts";
import { CHUNK_PIXELS } from "../src/world/terrain.ts";
import { Recorder } from "./helpers/recordingContext.ts";
import { withDocument } from "./helpers/paintChunk.ts";

/**
 * Pré-geração de chunks (ADR 0047): o agendador (puro) escolhe quais vizinhos preparar e em que ordem; o `WorldRenderer`
 * dá poucos passos por quadro. O objetivo medido é um só: andando, o `render` nunca precisa gerar um chunk de uma vez.
 */
const S = CHUNK_PIXELS, W = 1280, H = 720;
const limits = (over: Partial<PrefetchLimits> = {}): PrefetchLimits => ({ ...PREFETCH_LIMITS, chunkPixels: S, capacity: 24, ...over });
const view = (over: Partial<PrefetchView> = {}): PrefetchView => ({ cameraX: 4 * S + S / 2, cameraY: 4 * S + S / 2, width: W, height: H, velocityX: 0, velocityY: 0, ...over });
const none = (): boolean => false;
const key = (c: readonly [number, number]): string => c[0] + "," + c[1];

test("os chunks visíveis são os mesmos que o render desenha", () => {
  assert.equal(visibleChunks(view(), S).length, 9, "1280 × 720 px, câmera no meio de um chunk: 3 × 3");
  assert.equal(visibleChunks(view({ cameraX: 4 * S, cameraY: 4 * S }), S).length, 8, "câmera numa quina: 4 × 2");
  // A mesma conta do WorldRenderer.render: de chunkOf(left) a chunkOf(left + width).
  const v = view({ cameraX: 2000, cameraY: 3100 }), left = v.cameraX - W / 2, top = v.cameraY - H / 2;
  const expected: string[] = [];
  for (let cy = Math.floor(top / S); cy <= Math.floor((top + H) / S); cy++) for (let cx = Math.floor(left / S); cx <= Math.floor((left + W) / S); cx++) expected.push(cx + "," + cy);
  assert.deepEqual(visibleChunks(v, S).map(key), expected);
});

test("andando para a direita, os primeiros a preparar são os da direita; para baixo, os de baixo", () => {
  const right = prefetchPlan(view({ velocityX: 170 }), limits(), none), down = prefetchPlan(view({ velocityY: 170 }), limits(), none);
  assert.ok(right.length >= 3 && down.length >= 3);
  const [cx0] = right[0]!;
  assert.ok(cx0 >= 6, "o primeiro da direita fica à direita da tela: " + key(right[0]!));
  assert.ok(right.slice(0, 3).every(([cx]) => cx >= 6), "os três primeiros são da coluna da direita");
  assert.ok(down.slice(0, 3).every(([, cy]) => cy >= 6), "os três primeiros são da linha de baixo");
  const left = prefetchPlan(view({ velocityX: -170 }), limits(), none), up = prefetchPlan(view({ velocityY: -170 }), limits(), none);
  assert.ok(left.slice(0, 3).every(([cx]) => cx <= 2) && up.slice(0, 3).every(([, cy]) => cy <= 2), "e o contrário nas outras direções");
});

test("o plano nunca inclui o que a tela já mostra, o que já está no cache nem repete um chunk", () => {
  const visible = new Set(visibleChunks(view(), S).map(key));
  const plan = prefetchPlan(view({ velocityX: 170 }), limits(), none);
  assert.ok(plan.every(c => !visible.has(key(c))), "nenhum visível");
  assert.equal(new Set(plan.map(key)).size, plan.length, "sem repetição");
  const cached = new Set(plan.slice(0, 3).map(key));
  const next = prefetchPlan(view({ velocityX: 170 }), limits(), (cx, cy) => cached.has(cx + "," + cy));
  assert.ok(next.every(c => !cached.has(key(c))), "o que já foi gerado sai do plano");
  assert.equal(next.length, Math.min(plan.length - 3 + 0, next.length), "e o resto continua na fila");
});

test("o plano respeita o cache: capacidade menos a folga menos a tela, e some quando não há lugar", () => {
  const visible = visibleChunks(view(), S).length;
  assert.equal(prefetchPlan(view({ velocityX: 170 }), limits(), none).length, 24 - PREFETCH_LIMITS.slack - visible, "tela de 9: sobram 13 vagas");
  const wide = view({ cameraX: 4 * S, cameraY: 4 * S });
  assert.equal(prefetchPlan(wide, limits(), none).length, 24 - PREFETCH_LIMITS.slack - 8, "tela de 8: sobram 14");
  assert.equal(prefetchPlan(wide, limits({ capacity: 11 }), none).length, 1, "uma vaga só");
  assert.deepEqual(prefetchPlan(wide, limits({ capacity: 10 }), none), [], "sem vaga, nada a preparar");
  assert.deepEqual(prefetchPlan(wide, limits({ capacity: 5 }), none), []);
});

test("câmera parada prepara o anel em volta pelo mais perto; valores inválidos não geram nada nem lançam", () => {
  const still = prefetchPlan(view(), limits(), none);
  assert.ok(still.length > 0, "parado também prepara o anel");
  const center = { x: 4 * S + S / 2, y: 4 * S + S / 2 }, dist = (c: readonly [number, number]): number => Math.hypot((c[0] + 0.5) * S - center.x, (c[1] + 0.5) * S - center.y);
  for (let i = 1; i < still.length; i++) assert.ok(dist(still[i]!) >= dist(still[i - 1]!) - 1e-6, "do mais perto ao mais longe");
  for (const bad of [Number.NaN, Infinity, -Infinity]) {
    assert.deepEqual(prefetchPlan(view({ cameraX: bad }), limits(), none), []);
    assert.deepEqual(prefetchPlan(view({ velocityY: bad }), limits(), none), []);
  }
  assert.deepEqual(prefetchPlan(view({ width: 0 }), limits(), none), []);
  assert.deepEqual(prefetchPlan(view(), limits({ chunkPixels: 0 }), none), []);
  const slow = prefetchPlan(view({ velocityX: 2 }), limits(), none);
  assert.deepEqual(slow.map(key), still.map(key), "abaixo de 4 px/s conta como parada");
});

/** Um WorldRenderer com Canvas gravador, para rodar em Node. */
function world(): WorldRenderer {
  const recorder = new Recorder();
  const proxy = new Proxy(recorder.ctx, {
    get(target, prop) {
      if (prop === "createImageData") return (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
      const value = (target as unknown as Record<string | symbol, unknown>)[prop];
      return typeof value === "function" ? (value as (...x: unknown[]) => unknown).bind(target) : value;
    },
    set(target, prop, value) { (target as unknown as Record<string | symbol, unknown>)[prop] = value; return true; },
  });
  (globalThis as Record<string, unknown>).document = { createElement: () => ({ width: 0, height: 0, getContext: () => proxy }) };
  return new WorldRenderer(842136);
}
const stub = new Recorder().ctx;
const draw = (w: WorldRenderer, x: number, y: number, t: number): void => w.render(stub, x, y, W, H, t, false);
const done = (): void => { delete (globalThis as Record<string, unknown>).document; };

test("andando 12 s pela cidade a 170 px/s, o render não gera chunk nenhum depois do primeiro quadro", () => {
  const w = world();
  try {
    let x = -1100, y = 15500 * 32, t = 0;
    draw(w, x, y, t);
    const initial = w.stats().generatedInRender;
    assert.ok(initial >= 6 && initial <= 12, "a tela inicial: " + initial);
    let maxCache = 0, steps = 0;
    for (let i = 0; i < 60 * 12; i++) {
      t += 1 / 60; x += 170 / 60;
      draw(w, x, y, t);
      steps += w.warmAhead(x, y, W, H, t);
      maxCache = Math.max(maxCache, w.getCachedCount());
    }
    const s = w.stats();
    assert.equal(s.generatedInRender, initial, "nenhum chunk gerado dentro do render depois do começo");
    assert.ok(s.generatedByPrefetch >= 8, "o prefetch gerou os vizinhos: " + s.generatedByPrefetch);
    assert.ok(maxCache <= 24, "o cache nunca passa da capacidade: " + maxCache);
    assert.ok(steps === s.stepsByPrefetch);
  } finally { done(); }
});

test("andando na diagonal e mudando de direção, o render continua sem gerar chunk", () => {
  const w = world();
  try {
    let x = -700, y = 15350 * 32, t = 0;
    draw(w, x, y, t);
    const initial = w.stats().generatedInRender;
    for (let i = 0; i < 60 * 12; i++) {
      t += 1 / 60;
      const dir = i < 240 ? [150, 120] : i < 480 ? [-120, 150] : [-170, -60];
      x += dir[0]! / 60; y += dir[1]! / 60;
      draw(w, x, y, t); w.warmAhead(x, y, W, H, t);
    }
    assert.ok(w.stats().generatedInRender - initial <= 2, "no máximo uma curva fechada pega o prefetch de surpresa: " + (w.stats().generatedInRender - initial));
    assert.ok(w.getCachedCount() <= 24);
  } finally { done(); }
});

test("cada chamada dá no máximo dois passos e o chunk pedido no meio da geração é concluído, não refeito", () => {
  const w = world();
  try {
    draw(w, 4 * S, 4 * S, 0);
    const before = w.stats();
    assert.ok(w.warmAhead(4 * S, 4 * S, W, H, 0.01) <= 2, "no máximo dois passos por quadro");
    for (let i = 0; i < 5; i++) assert.ok(w.warmAhead(4 * S, 4 * S, W, H, 0.02 + i * 0.01) <= 2);
    const mid = w.stats();
    assert.ok(mid.stepsByPrefetch - before.stepsByPrefetch <= 12 && mid.stepsByPrefetch - before.stepsByPrefetch >= 10, "seis chamadas de dois passos: " + (mid.stepsByPrefetch - before.stepsByPrefetch));
    // Pede por cima, no render, o chunk que o prefetch está gerando: o render conclui o que falta, e conta como gerado no render.
    const job = (w as unknown as { job: { cx: number; cy: number } | null }).job;
    assert.ok(job, "há um chunk em geração");
    const inRender = w.stats().generatedInRender, prefetched = w.stats().generatedByPrefetch, cached = w.getCachedCount();
    (w as unknown as { chunk(cx: number, cy: number): unknown }).chunk(job.cx, job.cy);
    assert.equal((w as unknown as { job: unknown }).job, null, "o chunk foi concluído e o trabalho encerrado");
    assert.equal(w.stats().generatedInRender, inRender, "concluir o que o prefetch começou não conta como geração do render");
    assert.equal(w.stats().generatedByPrefetch, prefetched, "e também não conta como pré-gerado");
    assert.equal(w.getCachedCount(), cached + 1, "o chunk concluído entrou no cache, uma vez");
  } finally { done(); }
});

test("câmera com valores inválidos não faz nada; um salto grande não vira velocidade; clear zera o estado", () => {
  const w = world();
  try {
    draw(w, 4 * S, 4 * S, 0);
    for (const bad of [Number.NaN, Infinity]) assert.equal(w.warmAhead(bad, 0, W, H, 1), 0);
    assert.equal(w.warmAhead(0, 0, W, H, Number.NaN), 0);
    w.warmAhead(4 * S, 4 * S, W, H, 1);
    // salto de 50 chunks: como teletransporte, a câmera conta como parada (não olha 50 chunks à frente) e o chunk
    // que estava em geração, agora longe, é abandonado, no eixo x e no eixo y
    const jobOf = (): { cx: number; cy: number } | null => (w as unknown as { job: { cx: number; cy: number } | null }).job;
    const cachedAt = (cx: number, cy: number): boolean => (w as unknown as { cache: Map<string, unknown> }).cache.has(cx + "," + cy);
    for (const [nx, ny] of [[54 * S, 4 * S], [4 * S, 54 * S]] as const) {
      w.warmAhead(4 * S, 4 * S, W, H, 2); // garante um chunk em geração perto do ponto de partida
      assert.ok(jobOf(), "há um chunk em geração antes do salto");
      draw(w, nx, ny, 2.016);
      w.warmAhead(nx, ny, W, H, 2.016);
      const planned = jobOf();
      assert.ok(planned && Math.abs(planned.cx - nx / S) <= 3 && Math.abs(planned.cy - ny / S) <= 3, "o chunk em geração é vizinho do novo lugar: " + JSON.stringify(planned));
      const still = prefetchPlan({ cameraX: nx, cameraY: ny, width: W, height: H, velocityX: 0, velocityY: 0 }, limits(), cachedAt);
      assert.deepEqual(planned && [planned.cx, planned.cy], still[0] && [...still[0]], "e é o mais perto, como câmera parada, não o da direção do salto");
      w.warmAhead(4 * S, 4 * S, W, H, 3); w.warmAhead(4 * S, 4 * S, W, H, 3.02);
    }
    w.clear();
    assert.equal(w.getCachedCount(), 0);
    assert.equal((w as unknown as { job: unknown }).job, null);
  } finally { done(); }
});

test("a cena do jogo chama o prefetch junto do render, depois dele", () => {
  const source = readFileSync("src/ui/CanvasScene.ts", "utf8");
  assert.ok(source.indexOf("world.render(ctx, cameraX, cameraY, width, height, time, animated);") < source.indexOf("world.warmAhead(cameraX, cameraY, width, height, time);"));
});
