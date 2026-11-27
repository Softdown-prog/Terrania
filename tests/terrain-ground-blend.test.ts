import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GROUND_BLEND_PX, generateChunkCanvas } from "../src/render/terrain.ts";
import { CHUNK_PIXELS, TILE_SIZE } from "../src/world/terrain.ts";
import { Recorder } from "./helpers/recordingContext.ts";
import { withDocument } from "./helpers/paintChunk.ts";

/** Transição suave entre solos (ADR 0107): o desfoque do chão deixa a troca de mata, grama e areia em degradê macio, sem os degraus retos de tile. */
const SEED = 842136;

function filtersOf(cx: number, cy: number): string[] {
  const recorder = new Recorder(), seen: string[] = [];
  const proxy = new Proxy(recorder.ctx, {
    get(target, prop) {
      if (prop === "createImageData") return (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
      const value = (target as unknown as Record<string | symbol, unknown>)[prop];
      return typeof value === "function" ? (value as (...x: unknown[]) => unknown).bind(target) : value;
    },
    set(target, prop, value) { if (prop === "filter") seen.push(String(value)); (target as unknown as Record<string | symbol, unknown>)[prop] = value; return true; },
  });
  withDocument({ createElement: () => ({ width: 0, height: 0, getContext: () => proxy }) }, () => generateChunkCanvas(cx, cy, SEED));
  return seen;
}

test("o desfoque do chão é de 11 px, largo o bastante para arredondar o degrau de tile e dentro da folga de um tile que o chunk pinta além da borda", () => {
  assert.equal(GROUND_BLEND_PX, 11);
  assert.ok(GROUND_BLEND_PX >= 8, "abaixo de 8 px os degraus retos voltam");
  assert.ok(GROUND_BLEND_PX < TILE_SIZE, "o desfoque não pode passar da folga de um tile (senão aparece costura entre chunks)");
  assert.equal(CHUNK_PIXELS % TILE_SIZE, 0);
});

test("o chunk aplica esse desfoque ao chão e depois o desliga, na vila, na mata, na capital e no deserto", () => {
  for (const [name, cx, cy] of [["vila", 0, 0], ["mata", -9, 0], ["capital", -1, -50], ["deserto", 1, 977]] as const)
    assert.deepEqual(filtersOf(cx, cy), [`blur(${GROUND_BLEND_PX}px)`, "none"], name);
});

test("o valor sai de uma constante só: nada de número solto no desfoque do chão", () => {
  const source = readFileSync("src/render/terrain.ts", "utf8");
  assert.match(source, /ctx\.filter = `blur\(\$\{GROUND_BLEND_PX\}px\)`;/);
  assert.equal(/blur\(\d+px\)/.test(source), false);
});
