import {
  CHUNK_PIXELS,
  CHUNK_TILES,
  TILE_SIZE,
  chunkOf,
  getTile,
} from "../world/terrain.ts";
import { LANDMARKS } from "../world/landmarks.ts";
import { LANDMARK_CELL_TILES, getRegionalLandmarkForCell } from "../world/regionalLandmarks.ts";
import { RUIN_CELL_TILES, getSouthRuinForCell } from "../world/southRuins.ts";
import { TOWER_CELL_TILES, getSouthTowerForCell } from "../world/towers/placement.ts";
import { RUIN_BACK_DEPTH, RUIN_FRONT_DEPTH } from "./south/ruins/depth.ts";
import { BUILDINGS } from "../world/village.ts";
import { SOUTH_CITY, SOUTH_CITY_PROPS } from "../world/southCity.ts";
import { generateChunkSteps } from "./terrain.ts";
import { PREFETCH_LIMITS, prefetchPlan } from "./chunkPrefetch.ts";
import type { Scenery } from "./scenery.ts";
import { rockStyleFor, rockVariant } from "./rocks/index.ts";
import { southDecorProp } from "./south/decor/index.ts";
interface ChunkVisual {
  canvas: HTMLCanvasElement;
  props: Scenery[];
  water: Array<{ x: number; y: number; phase: number; black?: true }>;
  /** Linhas de margem onde a água encontra terra, para a espuma animada. */
  foam: Array<{ x1: number; y1: number; x2: number; y2: number; phase: number; nx: number; ny: number; black?: true }>;
}
/** Quantos chunks o cache guarda (cada um é um canvas de 512 × 512 px). */
const CACHE_CAPACITY = 24;
/** Quantos passos de geração o `warmAhead` dá por quadro (ADR 0047). Um chunk tem uns 20 passos: pouco por quadro, vários quadros por chunk. */
const PREFETCH_STEPS_PER_FRAME = 2;
/** Até quantos chunks da câmera um chunk em geração ainda vale a pena terminar. */
const PREFETCH_REACH = 3;
/** Um chunk em geração fatiada: o gerador de passos e o canvas, que só existe no fim. */
interface ChunkJob { readonly cx: number; readonly cy: number; readonly steps: Generator<void, HTMLCanvasElement, void> }
/** Contadores para testes e diagnóstico: quantos chunks foram gerados de cada jeito. */
export interface WorldRendererStats { readonly generatedInRender: number; readonly generatedByPrefetch: number; readonly stepsByPrefetch: number }
/** Bounded LRU: ground is cached; tall objects are sorted with actors each frame. */
export class WorldRenderer {
  private readonly cache = new Map<string, ChunkVisual>();
  readonly seed: number;
  private lastView: { x: number; y: number; time: number } | null = null;
  private job: ChunkJob | null = null;
  private generatedInRender = 0;
  private generatedByPrefetch = 0;
  private stepsByPrefetch = 0;
  constructor(seed: number) { this.seed = seed; }
  private chunk(cx: number, cy: number): ChunkVisual {
    const key = cx + "," + cy;
    const cached = this.cache.get(key);
    if (cached) {
      this.cache.delete(key);
      this.cache.set(key, cached);
      return cached;
    }
    // O chunk pedido já está sendo gerado aos poucos pelo `warmAhead`: conclui o que falta, sem refazer o que já foi pintado.
    const pending = this.job && this.job.cx === cx && this.job.cy === cy ? this.job : null;
    if (pending) this.job = null; else this.generatedInRender++;
    return this.store(cx, cy, this.finish(pending?.steps ?? generateChunkSteps(cx, cy, this.seed)));
  }
  /** Percorre os passos que faltam e devolve o canvas pronto. */
  private finish(steps: Generator<void, HTMLCanvasElement, void>): HTMLCanvasElement {
    for (;;) {
      const next = steps.next();
      if (next.done) return next.value;
    }
  }
  /** Monta o que não é o chão (objetos, água, espuma) e guarda o chunk no cache. */
  private store(cx: number, cy: number, canvas: HTMLCanvasElement): ChunkVisual {
    const key = cx + "," + cy;
    const props: Scenery[] = [],
      water: ChunkVisual["water"] = [],
      foam: ChunkVisual["foam"] = [];
    for (let y = 0; y < CHUNK_TILES; y++)
      for (let x = 0; x < CHUNK_TILES; x++) {
        const tx = cx * CHUNK_TILES + x,
          ty = cy * CHUNK_TILES + y,
          tile = getTile(tx, ty, this.seed);
        if (tile.tree || tile.rock)
          props.push({
            kind: tile.tree ? "tree" : "rock",
            x: tx * TILE_SIZE + 16,
            y: ty * TILE_SIZE + 23,
            // Pedra: variação própria, porque o `decoration` de um tile de pedra é sempre pequeno (ADR 0035).
            variant: tile.rock ? rockVariant(tx, ty, this.seed) : tile.decoration,
            ...(tile.rock ? { rockStyle: rockStyleFor(tile.biome) } : {}),
          });
        // Decoração do deserto (ADR 0036): só visual, sem colisão, em chão livre de areia fora da cidade.
        const decor = southDecorProp(tx, ty, this.seed);
        if (decor) props.push(decor);
        if (tile.ground === "water") {
          const black = tile.biome === "black-lake";
          water.push({
            x: tx * TILE_SIZE + 8,
            y: ty * TILE_SIZE + 13,
            phase: tile.decoration * 6,
            ...(black ? { black: true as const } : {}),
          });
          const x0 = tx * TILE_SIZE, y0 = ty * TILE_SIZE, p = tile.decoration * 9;
          const S = TILE_SIZE;
          // No lago negro a costa é orgânica (ADR 0039): a espuma só corre no meio de cada aresta, onde a costa fica na
          // borda do tile, e não passa pelas quinas arredondadas.
          const inset = black ? 8 : 0;
          if (getTile(tx, ty - 1, this.seed).ground !== "water")
            foam.push({ x1: x0 + inset, y1: y0 + 1, x2: x0 + S - inset, y2: y0 + 1, phase: p, nx: 0, ny: -1, ...(black ? { black: true as const } : {}) });
          if (getTile(tx, ty + 1, this.seed).ground !== "water")
            foam.push({ x1: x0 + inset, y1: y0 + S - 1, x2: x0 + S - inset, y2: y0 + S - 1, phase: p + 2, nx: 0, ny: 1, ...(black ? { black: true as const } : {}) });
          if (getTile(tx - 1, ty, this.seed).ground !== "water")
            foam.push({ x1: x0 + 1, y1: y0 + inset, x2: x0 + 1, y2: y0 + S - inset, phase: p + 4, nx: -1, ny: 0, ...(black ? { black: true as const } : {}) });
          if (getTile(tx + 1, ty, this.seed).ground !== "water")
            foam.push({ x1: x0 + S - 1, y1: y0 + inset, x2: x0 + S - 1, y2: y0 + S - inset, phase: p + 6, nx: 1, ny: 0, ...(black ? { black: true as const } : {}) });
        }
      }
    const regional = getRegionalLandmarkForCell(
      Math.floor(cx * CHUNK_TILES / LANDMARK_CELL_TILES),
      Math.floor(cy * CHUNK_TILES / LANDMARK_CELL_TILES), this.seed,
    );
    if (regional && Math.floor(regional.tileX / CHUNK_TILES) === cx &&
        Math.floor(regional.tileY / CHUNK_TILES) === cy)
      props.push({ kind: "regional-landmark", landmarkKind: regional.kind,
        x: regional.x, y: regional.y, variant: regional.variant });
    const ruin = getSouthRuinForCell(
      Math.floor(cx * CHUNK_TILES / RUIN_CELL_TILES),
      Math.floor(cy * CHUNK_TILES / RUIN_CELL_TILES), this.seed,
    );
    if (ruin && Math.floor(ruin.tileX / CHUNK_TILES) === cx &&
        Math.floor(ruin.tileY / CHUNK_TILES) === cy)
      for (const layer of ["back", "front"] as const)
        props.push({ kind: "south-ruin", ruinLayer: layer, variant: ruin.variant, x: ruin.x,
          y: ruin.y + (layer === "back" ? -RUIN_BACK_DEPTH : RUIN_FRONT_DEPTH) });
    const tower = getSouthTowerForCell(
      Math.floor(cx * CHUNK_TILES / TOWER_CELL_TILES),
      Math.floor(cy * CHUNK_TILES / TOWER_CELL_TILES), this.seed,
    );
    if (tower && Math.floor(tower.tileX / CHUNK_TILES) === cx &&
        Math.floor(tower.tileY / CHUNK_TILES) === cy)
      props.push({ kind: "south-tower", towerId: tower.tower.id, variant: 0, x: tower.x, y: tower.y });
    const result = {
      canvas,
      props,
      water,
      foam,
    };
    this.cache.set(key, result);
    if (this.cache.size > CACHE_CAPACITY) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    return result;
  }
  render(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    width: number,
    height: number,
    time = 0,
    animated = true,
  ): void {
    const left = cameraX - width / 2,
      top = cameraY - height / 2;
    for (let cy = chunkOf(top); cy <= chunkOf(top + height); cy++)
      for (let cx = chunkOf(left); cx <= chunkOf(left + width); cx++) {
        const chunk = this.chunk(cx, cy);
        ctx.drawImage(
          chunk.canvas,
          Math.floor(cx * CHUNK_PIXELS - left),
          Math.floor(cy * CHUNK_PIXELS - top),
        );
        if (animated) {
          // Espuma que avança e recua na margem.
          ctx.lineWidth = 1.6;
          ctx.lineCap = "round";
          for (const f of chunk.foam) {
            const pulse = Math.sin(time * 1.3 + f.phase);
            const push = pulse * 1.3;
            const horizontal = f.y1 === f.y2;
            const ox = push * f.nx, oy = push * f.ny;
            const foamAlpha = (0.2 + 0.22 * (pulse * 0.5 + 0.5)).toFixed(3);
            // Lago negro: a borda é um fio roxo-acinzentado, não espuma branca.
            ctx.strokeStyle = f.black ? "rgba(140,118,180," + foamAlpha + ")" : "rgba(236,248,238," + foamAlpha + ")";
            ctx.beginPath();
            const steps = 4;
            for (let i = 0; i <= steps; i++) {
              const k = i / steps;
              const wob = Math.sin(time * 2 + f.phase + i * 1.7) * 0.9;
              const px = f.x1 + (f.x2 - f.x1) * k + (horizontal ? 0 : wob) + ox - left;
              const py = f.y1 + (f.y2 - f.y1) * k + (horizontal ? wob : 0) + oy - top;
              if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();
          }
          ctx.lineCap = "butt";
          // Ondulações e cintilações sobre a água.
          ctx.lineWidth = 0.9;
          for (const spot of chunk.water) {
            const wave = Math.sin(time * 1.5 + spot.phase);
            ctx.strokeStyle = spot.black ? "#a78fd855" : "#c8e1bf55";
            if (wave >= 0.4) {
              ctx.globalAlpha = (wave - 0.4) * 0.8;
              ctx.beginPath();
              ctx.moveTo(spot.x - left, spot.y - top + wave * 2);
              ctx.quadraticCurveTo(spot.x - left + 5, spot.y - top + wave * 2 - 1.4, spot.x - left + 9 + wave * 4, spot.y - top + wave * 2);
              ctx.stroke();
            }
            const glint = Math.sin(time * 2.3 + spot.phase * 3.1);
            if (glint > 0.93) {
              const gx = spot.x - left + 12, gy = spot.y - top + 6, s = (glint - 0.93) * 55;
              ctx.globalAlpha = Math.min(1, (glint - 0.93) * 14);
              ctx.fillStyle = spot.black ? "#d9ccff" : "#f7ffee";
              ctx.beginPath();
              ctx.moveTo(gx, gy - s); ctx.lineTo(gx + s * 0.28, gy); ctx.lineTo(gx, gy + s); ctx.lineTo(gx - s * 0.28, gy);
              ctx.closePath(); ctx.fill();
              ctx.fillRect(gx - s, gy - 0.4, s * 2, 0.8);
            }
          }
          ctx.globalAlpha = 1;
        }
      }
  }
  objects(
    cameraX: number,
    cameraY: number,
    width: number,
    height: number,
  ): Scenery[] {
    const left = cameraX - width / 2 - 45,
      top = cameraY - height / 2 - 10;
    const right = left + width + 90,
      bottom = top + height + 110;
    const result: Scenery[] = [];
    // A ruína tem ~230 px de largura e a torre ~230 px de altura: as margens delas são maiores para não aparecerem de repente.
    const wide = 125, tall = 130;
    for (let cy = chunkOf(top); cy <= chunkOf(bottom + tall); cy++)
      for (let cx = chunkOf(left - wide); cx <= chunkOf(right + wide); cx++) {
        for (const prop of this.chunk(cx, cy).props) {
          const pad = prop.kind === "south-ruin" ? wide : prop.kind === "south-tower" ? 70 : 0;
          const padBottom = prop.kind === "south-tower" ? tall : 0;
          if (
            prop.x > left - pad &&
            prop.x < right + pad &&
            prop.y > top &&
            prop.y < bottom + padBottom
          )
            result.push(prop);
        }
      }
    for (const b of BUILDINGS)
      if (b.x > left - 60 && b.x < right + 60 && b.y > top - 110 && b.y < bottom + 20)
        result.push({ kind: "house", x: b.x, y: b.y, variant: b.variant });
    // O custo é fixo e o distrito não existe na câmera de outras regiões.
    const centerY=(SOUTH_CITY.centerY+.5)*TILE_SIZE;
    if (Math.abs(cameraX)<1800 && Math.abs(cameraY-centerY)<1800)
      for (const prop of SOUTH_CITY_PROPS)
        if (prop.x>left-135&&prop.x<right+135&&prop.y>top-155&&prop.y<bottom+45)
          result.push({kind:"south-city",cityKind:prop.kind,
            ...(prop.id?{cityId:prop.id}:{}),x:prop.x,y:prop.y,variant:prop.variant});
    for (const prop of LANDMARKS)
      if (
        prop.x > left - 40 &&
        prop.x < right + 40 &&
        prop.y > top &&
        prop.y < bottom
      )
        result.push(prop);
    return result;
  }
  /**
   * Prepara, antes de aparecer, os chunks vizinhos da tela, na direção em que a câmera anda (ADR 0047). Sem isso, cruzar a
   * divisa de um chunk obriga o `render` a gerar vários de uma vez, num único quadro. A geração é fatiada: cada chamada
   * dá no máximo `PREFETCH_STEPS_PER_FRAME` passos (uma fração de chunk), então o custo se espalha por vários quadros.
   * Devolve quantos passos deu. `time` é o relógio da simulação, o mesmo do `render`; só serve para medir a velocidade.
   */
  warmAhead(cameraX: number, cameraY: number, width: number, height: number, time: number): number {
    if (![cameraX, cameraY, width, height, time].every(Number.isFinite)) return 0;
    const previous = this.lastView, dt = previous ? time - previous.time : 0;
    // velocidade da câmera entre os dois últimos quadros; um salto grande (teletransporte, troca de modo) não é movimento
    const jump = previous ? Math.hypot(cameraX - previous.x, cameraY - previous.y) : 0;
    const still = !previous || dt <= 0 || dt > 0.5 || jump > CHUNK_PIXELS;
    this.lastView = { x: cameraX, y: cameraY, time };
    // Um chunk em geração que ficou longe da tela (teletransporte, troca de modo, curva fechada) não serve mais: abandona
    // em vez de gastar quadros terminando-o e deixar um chunk inútil no cache.
    if (this.job) {
      const near = (c: number, at: number): boolean => Math.abs(c - Math.floor(at / CHUNK_PIXELS)) <= PREFETCH_REACH;
      if (!near(this.job.cx, cameraX) || !near(this.job.cy, cameraY)) this.job = null;
    }
    let done = 0;
    while (done < PREFETCH_STEPS_PER_FRAME) {
      if (!this.job) {
        const plan = prefetchPlan(
          { cameraX, cameraY, width, height, velocityX: still ? 0 : (cameraX - previous!.x) / dt, velocityY: still ? 0 : (cameraY - previous!.y) / dt },
          { ...PREFETCH_LIMITS, chunkPixels: CHUNK_PIXELS, capacity: CACHE_CAPACITY },
          (cx, cy) => this.cache.has(cx + "," + cy),
        );
        const next = plan[0];
        if (!next) break;
        this.job = { cx: next[0], cy: next[1], steps: generateChunkSteps(next[0], next[1], this.seed) };
      }
      const job = this.job, step = job.steps.next();
      done++; this.stepsByPrefetch++;
      if (step.done) { this.job = null; this.generatedByPrefetch++; this.store(job.cx, job.cy, step.value); }
    }
    return done;
  }
  /** Quantos chunks foram gerados dentro do `render` (o que o `warmAhead` não evitou) e quantos pelo `warmAhead`. */
  stats(): WorldRendererStats {
    return { generatedInRender: this.generatedInRender, generatedByPrefetch: this.generatedByPrefetch, stepsByPrefetch: this.stepsByPrefetch };
  }
  clear(): void {
    this.cache.clear();
    this.lastView = null;
    this.job = null;
  }
  getCachedCount(): number {
    return this.cache.size;
  }
}
