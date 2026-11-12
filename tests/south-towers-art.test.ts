import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { TOWER_PAINTERS } from "../src/render/south/towers/index.ts";
import { MasonryBrush, BASALT, OUTLINE, SANDSTONE, noise } from "../src/render/south/kit/index.ts";
import { BASALT_WEAR, PATINA_WEAR, SAND_WEAR, MasonryWear } from "../src/render/south/kit/index.ts";
import { MasonryBlocks } from "../src/render/south/kit/index.ts";
import { SandDrift } from "../src/render/south/kit/index.ts";
import { Recorder } from "./helpers/recordingContext.ts";

/**
 * Acabamento do exterior das torres do Sul (ADR 0041): desgaste da alvenaria, entulho de blocos, areia com volume e
 * detalhes próprios de cada torre. O pincel é compartilhado; cada torre escolhe o tom do seu desgaste.
 */
type Rgb = readonly [number, number, number];
const signature = (draw: (c: CanvasRenderingContext2D) => void): string => { const r = new Recorder(); draw(r.ctx); return r.metrics().signature; };
interface Spy { raw: string[]; colors: Rgb[]; calls: Record<string, number>; args: Record<string, number[][]> }
function spy(draw: (c: CanvasRenderingContext2D) => void): Spy {
  const out: Spy = { raw: [], colors: [], calls: {}, args: {} }, recorder = new Recorder();
  const note = (value: unknown): void => {
    if (typeof value !== "string") return;
    out.raw.push(value);
    const hex = /^#([0-9a-f]{6})/i.exec(value), rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(value);
    if (hex) out.colors.push([parseInt(hex[1]!.slice(0, 2), 16), parseInt(hex[1]!.slice(2, 4), 16), parseInt(hex[1]!.slice(4, 6), 16)]);
    else if (rgb) out.colors.push([Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]);
  };
  const proxy = new Proxy(recorder.ctx, {
    get(t, p) {
      const v = (t as unknown as Record<string | symbol, unknown>)[p];
      if (typeof v !== "function") return v;
      return (...a: unknown[]) => {
        out.calls[String(p)] = (out.calls[String(p)] ?? 0) + 1;
        (out.args[String(p)] ??= []).push(a.filter((x): x is number => typeof x === "number"));
        const result = (v as (...x: unknown[]) => unknown).apply(t, a);
        if (p === "createLinearGradient" || p === "createRadialGradient") {
          const g = result as { addColorStop: (o: number, c: string) => void }, add = g.addColorStop.bind(g);
          g.addColorStop = (o, c) => { note(c); add(o, c); };
        }
        return result;
      };
    },
    set(t, p, v) { if (p === "fillStyle" || p === "strokeStyle") note(v); (t as unknown as Record<string | symbol, unknown>)[p] = v; return true; },
  });
  draw(proxy);
  return out;
}
const hexOf = (hex: string): Rgb => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const has = (s: Spy, [r, g, b]: Rgb): boolean => s.colors.some(([cr, cg, cb]) => cr === r && cg === g && cb === b);
const TOWER_IDS = ["vigia-caida", "miragem", "sol-negro"] as const;

test("cada assunto do desenho das torres está no seu arquivo", () => {
  const files = readdirSync(new URL("../src/render/south/towers/", import.meta.url)).filter(f => f.endsWith(".ts")).map(f => f.replace(/\.ts$/, "")).sort();
  assert.deepEqual(files, ["index", "miragem", "sceneryPainter", "sol-negro", "vigia-caida"], "só as três torres; o pincel, o desgaste, o entulho e a areia moraram no kit do Sul");
  const kit = readdirSync(new URL("../src/render/south/kit/", import.meta.url)).map(f => f.replace(/\.ts$/, "")).sort();
  assert.deepEqual(kit, ["blocks", "brush", "index", "palette", "sand", "wear"]);
  assert.match(readFileSync("src/render/south/kit/brush.ts", "utf8"), /export \* from "\.\/palette\.ts";/, "o pincel reexporta a paleta");
});

test("cada torre tem um desenho próprio, estável e equilibrado", () => {
  const sigs = TOWER_IDS.map(id => signature(c => TOWER_PAINTERS[id](c)));
  assert.equal(new Set(sigs).size, 3);
  assert.deepEqual(TOWER_IDS.map(id => signature(c => TOWER_PAINTERS[id](c))), sigs);
  for (const id of TOWER_IDS) { const r = new Recorder(); TOWER_PAINTERS[id](r.ctx); assert.equal(r.metrics().saves, r.metrics().restores, id); }
});

test("o desgaste: riscos por largura, covas, líquen e umidade com a cor do tom de cada torre", () => {
  const wear = (f: (w: MasonryWear) => void): Spy => spy(c => f(new MasonryWear(c)));
  assert.equal(wear(w => w.streaks(0, 26, 0, 60, 1, SAND_WEAR)).calls.createLinearGradient, 2);
  assert.equal(wear(w => w.streaks(0, 78, 0, 60, 1, SAND_WEAR)).calls.createLinearGradient, 6);
  assert.notEqual(signature(c => new MasonryWear(c).streaks(0, 78, 0, 60, 1, SAND_WEAR)), signature(c => new MasonryWear(c).streaks(0, 78, 0, 60, 2, SAND_WEAR)));
  for (const tone of [SAND_WEAR, PATINA_WEAR, BASALT_WEAR]) {
    const s = wear(w => { w.streaks(0, 40, 0, 60, 1, tone); w.pits(0, 40, 0, 60, 1, tone, 2); w.lichen(0, 40, 0, 60, 1, tone, 2); w.damp(0, 40, 60, 1, tone); });
    assert.ok(has(s, hexOf(tone.stain)), "fuligem");
    assert.ok(has(s, hexOf(tone.lichenA)) && has(s, hexOf(tone.lichenB)), "líquen, azinhavre ou musgo");
    assert.ok(has(s, hexOf(tone.salt)), "sal da pedra");
  }
  assert.equal(wear(w => w.pits(0, 60, 0, 90, 1, SAND_WEAR, 3)).calls.fillRect, 6, "cada cova: o buraco e a quina de luz");
  assert.equal(wear(w => w.lichen(0, 60, 0, 90, 1, SAND_WEAR, 4)).calls.fill, 8, "dois discos por mancha");
  assert.equal(wear(w => w.damp(0, 40, 60, 1, SAND_WEAR)).calls.createLinearGradient, 1);
  assert.notDeepEqual(hexOf(SAND_WEAR.lichenA), hexOf(PATINA_WEAR.lichenA));
});

test("o entulho são blocos de três faces e seixos, e cada bloco gira de um jeito", () => {
  const block = (turn: number): Spy => spy(c => new MasonryBlocks(c).block(10, 10, 6, SANDSTONE, turn));
  assert.equal(block(0.2).calls.fill, 4, "sombra, frente, topo e lado");
  assert.equal(block(0.2).calls.stroke, 1, "um contorno");
  assert.equal(block(0.2).calls.createLinearGradient, 1, "a frente tem volume");
  assert.notEqual(signature(c => new MasonryBlocks(c).block(10, 10, 6, SANDSTONE, 0.1)), signature(c => new MasonryBlocks(c).block(10, 10, 6, SANDSTONE, 0.9)));
  const pile = spy(c => new MasonryBlocks(c).scatter(1, 9, 62, SANDSTONE));
  assert.equal(pile.calls.createLinearGradient, 6, "nove peças: seis blocos (um de cada duas no três) e três seixos");
  assert.equal(spy(c => new MasonryBlocks(c).scatter(1, 9, 62, SANDSTONE)).calls.stroke, 6, "um contorno por bloco");
  assert.ok(has(pile, hexOf(SANDSTONE.light)) && has(pile, hexOf(SANDSTONE.dark)));
});

test("a areia tem volume e crista; a rampa encosta na parede e deixa a porta livre", () => {
  const pile = spy(c => new SandDrift(c).drift(20, 20, 9, 2.4, 3));
  assert.equal(pile.calls.createLinearGradient, 1);
  assert.ok(pile.colors.some(([r, g, b]) => r === 255 && g === 246 && b === 220), "crista de luz");
  assert.notEqual(signature(c => new SandDrift(c).drift(20, 20, 9, 2.4, 1)), signature(c => new SandDrift(c).drift(20, 20, 9, 2.4, 2)));
  const whole = spy(c => new SandDrift(c).slope(-30, 30, 1));
  const gapped = spy(c => new SandDrift(c).slope(-30, 30, 1, 12));
  assert.equal(whole.calls.createLinearGradient, 1);
  assert.equal(gapped.calls.createLinearGradient, 2, "duas rampas, uma de cada lado da porta");
  const xs = (s: Spy): number[] => (s.args.lineTo ?? []).map(a => a[0]!);
  assert.ok(xs(gapped).every(x => x <= -12 || x >= 12), "nada de areia no vão da porta");
  assert.ok(xs(whole).some(x => x > -12 && x < 12));
});

test("o pincel das torres aplica o desgaste na face, no lado e só no chão", () => {
  const face = (ground: boolean, wear = SAND_WEAR): Spy => spy(c => {
    const b = new MasonryBrush(c);
    b.brickFace(() => { c.beginPath(); c.rect(-20, -60, 40, 60); }, -20, 20, -60, 0, SANDSTONE, 1, 9, wear, ground);
  });
  const ground = face(true), air = face(false);
  assert.ok(has(ground, hexOf(SAND_WEAR.stain)) && has(ground, hexOf(SAND_WEAR.lichenA)), "a face tem fuligem e líquen");
  assert.equal(air.calls.createLinearGradient, 5, "volume, oclusão e três riscos de chuva numa face de 40 px");
  assert.equal((air.args.fillRect ?? []).filter(a => a[3] === 1 && a[2]! >= 8).length, 2, "duas covas de bloco solto, cada uma com a quina de luz");
  assert.equal((air.args.arc ?? []).length + (air.args.ellipse ?? []).length, 4, "duas manchas de líquen, com dois discos cada");
  assert.equal((ground.calls.createLinearGradient ?? 0) - (air.calls.createLinearGradient ?? 0), 1, "a umidade só sobe do chão");
  assert.ok(has(face(true, BASALT_WEAR), hexOf(BASALT_WEAR.lichenA)) && !has(face(true, BASALT_WEAR), hexOf(SAND_WEAR.lichenA)), "o tom vem do parâmetro");
  const side = spy(c => new MasonryBrush(c).sideFace(20, 0, -60, 9, SANDSTONE, SAND_WEAR));
  assert.ok(has(side, hexOf(SAND_WEAR.stain)), "riscos de chuva no lado");
  assert.ok((side.calls.createLinearGradient ?? 0) >= 4, "degradê do lado, riscos e oclusão: " + side.calls.createLinearGradient);
  assert.ok((side.args.lineTo ?? []).length > 12, "fiadas em perspectiva");
});

test("cada torre usa o desgaste do seu material e o seu detalhe próprio", () => {
  const vigia = spy(c => TOWER_PAINTERS["vigia-caida"](c)), miragem = spy(c => TOWER_PAINTERS.miragem(c)), sol = spy(c => TOWER_PAINTERS["sol-negro"](c));
  assert.ok(has(vigia, hexOf(SAND_WEAR.lichenA)) && !has(vigia, hexOf(BASALT_WEAR.lichenA)), "arenito: líquen ocre");
  assert.ok(has(miragem, hexOf(PATINA_WEAR.lichenA)) && has(miragem, hexOf(PATINA_WEAR.lichenB)), "pedra clara: azinhavre");
  assert.ok(has(sol, hexOf(BASALT_WEAR.lichenA)) && has(sol, hexOf(BASALT_WEAR.lichenB)), "basalto: musgo violeta");
  // Vigia: a espessura do topo quebrado (polígono atrás da face) e as duas vigas caídas.
  const firstTooth = -(112 - 4 - Math.abs(Math.sin(0.6)) * 20 - noise(0, 1, 23) * 5);
  assert.ok((vigia.args.lineTo ?? []).some(a => a[0] === -27 && Math.abs(a[1]! - (firstTooth - 3.2)) < 1e-9), "espessura do topo: o contorno de trás, 4 px à direita e 3,2 acima do primeiro dente");
  const crown = spy(c => new MasonryBrush(c).crown([[-10, -20], [0, -30], [10, -22]], SANDSTONE));
  assert.deepEqual([crown.calls.fill, crown.calls.stroke, crown.calls.closePath], [1, 1, 1], "preenche e contorna uma vez");
  assert.ok(has(crown, hexOf(SANDSTONE.light)) && has(crown, hexOf(OUTLINE)), "tom claro com contorno");
  assert.deepEqual(crown.args.lineTo?.slice(-3).map(a => a.map(n => Math.round(n * 10) / 10)), [[14, -25.2], [4, -33.2], [-6, -23.2]], "a volta de trás desloca 4 px e 3,2 px");
  assert.equal(vigia.args.rotate?.length, 2, "duas vigas caídas ao pé da parede");
  // Miragem: azinhavre escorrendo das três faixas e luz violeta vazando de quatro janelas.
  assert.equal((miragem.args.createRadialGradient ?? []).filter(a => a[5] === 14 || a[5] === 12 || a[5] === 13).length, 4, "luz das janelas na pedra");
  // Sol Negro: três faixas de brilho de obsidiana por andar e fuligem sobre os dois braseiros.
  assert.ok(sol.raw.includes("rgba(185,168,216,0.2)"), "brilho de obsidiana");
  assert.ok(sol.raw.includes("rgba(14,8,20,0.55)"), "a fuligem do fogo escurece para baixo");
  assert.deepEqual((sol.args.fillRect ?? []).filter(a => a[1] === -44 && a[2] === 12 && a[3] === 22).map(a => a[0]), [-33, 21], "fuligem sobre cada braseiro");
  assert.ok(miragem.raw.some(r => /^rgba\(201, ?168, ?255, ?0\.32\)$/.test(r)), "luz violeta que vaza das janelas");
  assert.ok(has(sol, hexOf(BASALT.dark)));
});
