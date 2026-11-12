import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { SOUTH_BUILDINGS } from "../src/world/southCity.ts";
import { BUILDING_PAINTERS, buildingHasFlame, buildingPainterFor, paintBuildingFlame } from "../src/render/south/city/buildings/index.ts";
import { BuildingKit } from "../src/render/south/city/buildings/kit.ts";
import { BONE, CLAY, CLAY_WEAR, STONE, STONE_WEAR, WINE } from "../src/render/south/city/buildings/palette.ts";
import { FORGE_CHIMNEY_TOP, paintFornalha } from "../src/render/south/city/buildings/forge.ts";
import { POISONS_STILL_TOP, paintCasaDeVenenos } from "../src/render/south/city/buildings/poisons.ts";
import { renderScenery, clearSceneryCache } from "../src/render/scenery.ts";
import { Recorder } from "./helpers/recordingContext.ts";
import { withDocument } from "./helpers/paintChunk.ts";

/**
 * Prédios da cidade do Poço Negro (ADR 0043 e 0044): um pintor por prédio no seu arquivo, feitos com o kit de parede,
 * telhados, ameias e toldo; corpo no cache e só a chama animada a cada quadro.
 */
interface Spy { raw: string[]; calls: Record<string, number>; args: Record<string, number[][]> }
function spy(draw: (c: CanvasRenderingContext2D) => void): Spy {
  const out: Spy = { raw: [], calls: {}, args: {} }, recorder = new Recorder();
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
          g.addColorStop = (o, c) => { out.raw.push(c); add(o, c); };
        }
        return result;
      };
    },
    set(t, p, v) { if ((p === "fillStyle" || p === "strokeStyle") && typeof v === "string") out.raw.push(v); (t as unknown as Record<string | symbol, unknown>)[p] = v; return true; },
  });
  draw(proxy);
  return out;
}
const signature = (draw: (c: CanvasRenderingContext2D) => void): string => { const r = new Recorder(); draw(r.ctx); return r.metrics().signature; };
const MIGRATED = SOUTH_BUILDINGS.map(b => b.id);
const variantOf = (id: string): number => SOUTH_BUILDINGS.find(b => b.id === id)!.variant;

test("cada um dos doze prédios tem o seu arquivo na pasta da cidade, mais o kit, a paleta e a chama", () => {
  const files = readdirSync(new URL("../src/render/south/city/buildings/", import.meta.url)).map(f => f.replace(/\.ts$/, "")).sort();
  assert.deepEqual(files, ["bazaar", "flame", "forge", "fortress", "homeBone", "homeClay", "homeHide", "homeStilts", "index", "inn", "kit", "ossuary", "palette", "poisons", "stable", "temple"]);
});

test("há um pintor para cada um dos doze prédios da cidade, e só para eles", () => {
  assert.equal(SOUTH_BUILDINGS.length, 12);
  assert.deepEqual(Object.keys(BUILDING_PAINTERS).sort(), [...MIGRATED].sort());
  for (const id of MIGRATED) assert.equal(typeof buildingPainterFor(variantOf(id)), "function", id);
  assert.equal(buildingPainterFor(12), undefined, "não há décimo terceiro prédio");
  assert.equal(buildingPainterFor(Number.NaN), undefined);
  assert.equal(buildingPainterFor(-3), undefined);
  assert.equal(readFileSync("src/render/southCityArt.ts", "utf8").includes("function building("), false, "o desenho antigo dos prédios saiu");
  assert.equal(buildingPainterFor(0.4), BUILDING_PAINTERS["south-fortress"], "o índice é arredondado, como no cenário");
});

test("cada prédio é estável, tem desenho próprio, equilibra o estado e cabe no sprite do cenário", () => {
  const sigs = MIGRATED.map(id => signature(c => BUILDING_PAINTERS[id]!(c)));
  assert.equal(new Set(sigs).size, MIGRATED.length);
  assert.deepEqual(MIGRATED.map(id => signature(c => BUILDING_PAINTERS[id]!(c))), sigs);
  for (const id of MIGRATED) {
    const r = new Recorder(); BUILDING_PAINTERS[id]!(r.ctx);
    const m = r.metrics();
    assert.equal(m.saves, m.restores, id);
    assert.ok(m.width < 220 && m.height < 190, `${id}: ${m.width.toFixed(0)}×${m.height.toFixed(0)} cabe em 220×190`);
    assert.ok(m.paintOps > 120, `${id}: ${m.paintOps} operações de pintura`);
  }
  const OPEN = ["south-stable", "south-home-hide"]; // baia aberta e tenda: a entrada é um vão escuro, sem porta
  for (const id of MIGRATED) assert.ok(spy(c => BUILDING_PAINTERS[id]!(c)).raw.includes(OPEN.includes(id) ? "#171210" : "#d9a24a"), `${id} tem entrada (${OPEN.includes(id) ? "vão escuro" : "porta com maçaneta de bronze"})`);
  assert.ok((spy(c => BUILDING_PAINTERS["south-fortress"]!(c)).calls.strokeRect ?? 0) >= 13 + 4, "a fortaleza tem 13 ameias (9 no corpo e 4 na torre) e as frestas de arqueiro");
  const fortress = new Recorder(); BUILDING_PAINTERS["south-fortress"]!(fortress.ctx);
  assert.ok(fortress.metrics().height > 120, "a fortaleza é o prédio mais alto");
});

test("a parede tem três texturas, cada uma com desgaste: reboco, tábuas e alvenaria", () => {
  const wall = (texture: "adobe" | "plank" | "masonry"): string => signature(c => new BuildingKit(c).facade(-30, 30, -40, 0, CLAY, 3, texture, CLAY_WEAR));
  assert.equal(new Set([wall("adobe"), wall("plank"), wall("masonry")]).size, 3);
  const adobe = spy(c => new BuildingKit(c).facade(-30, 30, -40, 0, CLAY, 3, "adobe", CLAY_WEAR));
  const air0 = spy(c => new BuildingKit(c).facade(-30, 30, -40, 0, CLAY, 3, "adobe", CLAY_WEAR, false));
  assert.equal(air0.calls.createLinearGradient, 7, "volume, cinco riscos de chuva (60 px ÷ 13) e a oclusão do chão");
  assert.ok((adobe.calls.quadraticCurveTo ?? 0) >= 5, "camadas de barro feitas à mão: " + adobe.calls.quadraticCurveTo);
  assert.ok(adobe.raw.includes(`rgba(61,38,22,0.5)`) || adobe.raw.some(r => r.startsWith("rgba(61,38,22")), "fuligem de chuva");
  assert.equal(adobe.calls.clip, 1, "a textura é recortada na parede");
  const planks = spy(c => new BuildingKit(c).facade(-28, 28, -40, 0, CLAY, 3, "plank", CLAY_WEAR));
  assert.ok((planks.args.fillRect ?? []).filter(a => a[2] === 6).length >= 8, "oito tábuas de 6 px de largura (7 menos o vão)");
  const ground = spy(c => new BuildingKit(c).facade(-30, 30, -40, 0, CLAY, 3, "adobe", CLAY_WEAR, true)), air = spy(c => new BuildingKit(c).facade(-30, 30, -40, 0, CLAY, 3, "adobe", CLAY_WEAR, false));
  assert.equal((ground.calls.createLinearGradient ?? 0) - (air.calls.createLinearGradient ?? 0), 1, "a umidade só sobe do chão");
  assert.notEqual(signature(c => new BuildingKit(c).facade(-30, 30, -40, 0, CLAY, 3, "adobe", CLAY_WEAR)), signature(c => new BuildingKit(c).facade(-30, 30, -40, 0, CLAY, 4, "adobe", CLAY_WEAR)), "o sorteio muda o desgaste");
  const stone = spy(c => new BuildingKit(c).facade(-30, 30, -40, 0, STONE, 3, "masonry", STONE_WEAR));
  assert.ok(stone.raw.includes("#6f5a8c") || stone.raw.some(r => /^rgba\(111, ?90, ?140/.test(r)), "musgo roxo na pedra");
});

test("o telhado tem fiadas de telhas que crescem com a altura, beiral com sombra e cumeeira", () => {
  const roof = (high: number): Spy => spy(c => new BuildingKit(c).tiledRoof(-40, 40, 0, -high, 6, WINE, 2));
  assert.ok((roof(30).calls.arc ?? 0) > (roof(15).calls.arc ?? 0) * 1.5, "mais altura, mais fiadas");
  const r = roof(28);
  assert.ok(r.raw.includes("rgba(34,26,43,0.4)"), "sombra do beiral na parede");
  assert.equal((r.args.strokeRect ?? []).length, 1, "a cumeeira, com contorno");
  assert.ok((r.args.fillRect ?? []).some(a => a[1] === 0 && a[3] === 2.4), "espessura do beiral");
  assert.notEqual(signature(c => new BuildingKit(c).tiledRoof(-40, 40, 0, -28, 6, WINE, 2)), signature(c => new BuildingKit(c).tiledRoof(-40, 40, 0, -28, 6, WINE, 3)));
});

test("as ameias são blocos com topo e lado; o toldo tem uma tira por cor e bainha em onda", () => {
  const crenels = spy(c => new BuildingKit(c).crenels(-30, 30, -40, 5, 9, BONE));
  assert.equal(crenels.calls.strokeRect, 5, "cinco ameias com contorno");
  assert.equal(crenels.calls.createLinearGradient, 5, "cada uma com volume");
  assert.equal((crenels.args.fillRect ?? []).filter(a => a[3] === 2.6).length, 5, "e o topo claro");
  const awning = spy(c => new BuildingKit(c).awning(-40, 40, -30, 12, WINE, BONE, 8));
  assert.equal(awning.calls.arc, 8, "uma bainha em arco por tira");
  assert.ok(awning.raw.includes(WINE.light) && awning.raw.includes(BONE.light), "as duas cores alternadas");
  const light = spy(c => new BuildingKit(c).spill(0, 0, 16, "#ffcf6a"));
  assert.ok(light.raw.includes("rgba(255,207,106,0.34)"), "luz que o vidro lança na parede");
  assert.ok(spy(c => new BuildingKit(c).hangingSign(30, -20, 18, 14)).raw.includes("#3b3f46"), "braço de ferro da tabuleta");
});

test("a chama é só da Fornalha e da Casa de Venenos, apoiada no topo certo, e se mexe com o tempo", () => {
  assert.deepEqual(SOUTH_BUILDINGS.filter(b => buildingHasFlame(b.variant)).map(b => b.id), ["south-forge", "south-poisons"]);
  assert.equal(buildingHasFlame(Number.NaN), false);
  const none = spy(c => paintBuildingFlame(c, variantOf("south-fortress"), 1));
  assert.deepEqual(none.calls, {}, "prédio sem chama não pinta nada");
  assert.deepEqual(spy(c => paintBuildingFlame(c, variantOf("south-forge"), Number.NaN)).calls, {}, "tempo inválido não pinta");
  const forge = spy(c => paintBuildingFlame(c, variantOf("south-forge"), 0.4)), poison = spy(c => paintBuildingFlame(c, variantOf("south-poisons"), 0.4));
  assert.deepEqual(forge.args.translate![0], [FORGE_CHIMNEY_TOP.x, FORGE_CHIMNEY_TOP.y]);
  assert.deepEqual(poison.args.translate![0], [POISONS_STILL_TOP.x, POISONS_STILL_TOP.y]);
  assert.ok(forge.raw.includes("#ff9a3c") && !forge.raw.includes("#5aa032"), "fogo laranja");
  assert.ok(poison.raw.includes("#5aa032") && !poison.raw.includes("#ff9a3c"), "fogo verde");
  assert.notEqual(signature(c => paintBuildingFlame(c, 1, 0.4)), signature(c => paintBuildingFlame(c, 1, 0.9)), "a chama dança");
  const sway = Math.sin(0.4 * 10) * 2;
  assert.ok((forge.args.quadraticCurveTo ?? []).some(a => Math.abs(a[2]! - sway) < 1e-9), "a ponta da chama balança com o tempo: " + sway);
  const r = new Recorder(); paintBuildingFlame(r.ctx, 1, 0.4);
  assert.equal(r.metrics().saves, r.metrics().restores);
});

test("a chama se apoia exatamente na boca da chaminé e do alambique que o prédio desenha", () => {
  const forge = spy(c => paintFornalha(c)), still = spy(c => paintCasaDeVenenos(c));
  const cap = (forge.args.fillRect ?? []).find(a => a[2] === 22 && a[3] === 5)!;
  assert.ok(FORGE_CHIMNEY_TOP.x >= cap[0]! && FORGE_CHIMNEY_TOP.x <= cap[0]! + cap[2]!, "no meio da boca da chaminé");
  assert.ok(Math.abs(FORGE_CHIMNEY_TOP.y - cap[1]!) <= 3, "e no alto dela");
  const ring = (still.args.fillRect ?? []).find(a => a[2] === 22 && a[3] === 5)!;
  assert.ok(POISONS_STILL_TOP.x >= ring[0]! && POISONS_STILL_TOP.x <= ring[0]! + ring[2]! && Math.abs(POISONS_STILL_TOP.y - ring[1]!) <= 3, "o alambique");
});

test("o cenário põe o corpo do prédio no cache, uma vez, e pinta a chama a cada quadro", () => {
  clearSceneryCache();
  let created = 0;
  const doc = { createElement: () => { created++; return { width: 0, height: 0, getContext: () => new Recorder().ctx }; } };
  const frame = (variant: number, time: number): Spy => spy(c => withDocument(doc, () => renderScenery(c, { kind: "south-city", cityKind: "building", x: 100, y: 100, variant }, time, 0, 0)));
  const fortress = frame(variantOf("south-fortress"), 0.1);
  assert.equal(created, 1, "um sprite para a fortaleza");
  frame(variantOf("south-fortress"), 0.7);
  assert.equal(created, 1, "pedir de novo reaproveita");
  assert.equal(fortress.calls.createRadialGradient ?? 0, 0, "sem chama, nada é pintado por quadro");
  const forge = frame(variantOf("south-forge"), 0.1), again = frame(variantOf("south-forge"), 0.7);
  assert.equal(created, 2);
  assert.ok((forge.calls.createRadialGradient ?? 0) >= 1 && (again.calls.createRadialGradient ?? 0) >= 1, "a chama é pintada em todo quadro");
  for (const b of SOUTH_BUILDINGS) frame(b.variant, 0.1);
  assert.equal(created, 12, "um sprite por prédio, doze no total (a fortaleza e a fornalha já estavam no cache)");
  const wall = frame(-1, 0.1);
  assert.equal(created, 12, "um índice sem prédio não cria sprite nem pinta nada: " + JSON.stringify(wall.calls));
  clearSceneryCache();
});

test("o cenário escolhe o pintor novo pelo índice do prédio", () => {
  const source = readFileSync("src/render/scenery.ts", "utf8");
  assert.match(source, /buildingPainterFor\(prop\.variant\)/);
  assert.match(source, /sprite\("south-building-" \+ v, 220, 190, 110, 150, painter\)/);
  assert.match(source, /if \(buildingHasFlame\(v\)\) paintBuildingFlame\(ctx, v, time\)/);
});
