import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CAPITAL_BUILDING_ART } from "../src/render/center/capital/buildings/index.ts";
import { TimberKit } from "../src/render/center/capital/buildings/timber.ts";
import { AWNING, COPPER, FOREST, GLASS, GLASS_WARM, MARBLE, PLASTER, SHINGLE, TERRACOTTA, TIMBER } from "../src/render/center/capital/buildings/palette.ts";
import { CRIMSON, ARCANE } from "../src/render/center/capital/buildings/palette.ts";
import { GOLD } from "../src/render/center/kit/index.ts";
import { CAPITAL_BUILDINGS } from "../src/world/center/capital/index.ts";
import { signature, spy, type Spy } from "./helpers/spyContext.ts";

/**
 * Alameda das Guildas (ADR 0060): a Irmandade dos Arqueiros, a Hospedaria dos Viajantes, a Casa da Moeda e dos Mercadores e o
 * Templo da Concórdia, e o kit de madeira, toldos e arcadas que eles usam. A geometria, a colisão e os sprites dos oito edifícios
 * são conferidos em `center-capital-buildings.test.ts`; aqui está o que faz cada um ser o que é.
 */
const paint = (id: string): Spy => spy(c => CAPITAL_BUILDING_ART[id]!.paint(c));
const arcs = (s: Spy, r: number): number => (s.args.arc ?? []).filter(a => Math.abs(a[2]! - r) < 1e-9).length;
const rects = (s: Spy, w: number, h: number): number => (s.args.fillRect ?? []).filter(a => Math.abs(a[2]! - w) < 1e-9 && Math.abs(a[3]! - h) < 1e-9).length;
const times = (s: Spy, color: string): number => s.raw.filter(x => x === color).length;

test("os quatro edifícios da Alameda são o terreno de cada um, em ordem, e cada desenho é só dele", () => {
  const ids = ["arqueiros", "hospedaria", "casa-da-moeda", "templo"];
  assert.deepEqual(CAPITAL_BUILDINGS.slice(4).map(b => b.id), ids);
  assert.deepEqual(CAPITAL_BUILDINGS.slice(4).map(b => [b.plot.w, b.plot.h]), [[12, 13], [11, 13], [11, 13], [11, 13]]);
  const sigs = ids.map(id => signature(c => CAPITAL_BUILDING_ART[id]!.paint(c)));
  assert.equal(new Set(sigs).size, 4);
  for (const f of ["archers", "inn", "mint", "temple", "timber"]) for (const bad of ["Math.random", "Date.now", "performance.now", "new Date(", "render/south", "world/south"])
    assert.equal(readFileSync(`src/render/center/capital/buildings/${f}.ts`, "utf8").includes(bad), false, `${f}: ${bad}`);
});

test("Irmandade dos Arqueiros: dois alvos de cinco aros, três brasões do arco e flecha, quatro janelas com veneziana, carcazes e a torre de vigia verde", () => {
  const s = paint("arqueiros");
  for (const r of [13, 10.4, 7.8, 5.2, 2.6]) assert.equal(arcs(s, r), 2, `aro de ${r} nos dois alvos`);
  assert.equal(arcs(s, 16.5), 1, "o brasão grande sobre a porta"); assert.equal(arcs(s, 8.8), 2, "o brasão de cada pano");
  assert.equal(arcs(s, 9), 4 * 3, "quatro janelas de arco redondo (moldura, vidro e recorte)"); assert.equal(arcs(s, 4), 2 * 3, "as duas janelinhas das águas-furtadas");
  assert.equal(rects(s, 7, 36), 8, "uma veneziana de cada lado das quatro janelas, com 36 px"); assert.equal(rects(s, 26, 7), 4, "quatro floreiras");
  assert.equal(rects(s, 6, 98), 13, "treze montantes: a parede de 384 px tem doze vãos de 32"); assert.equal(rects(s, 26, 14), 3, "três fardos de feno"); assert.equal(rects(s, 384, 6), 3, "a viga do beiral e o soco");
  assert.equal(times(s, FOREST.base), 3); assert.equal(times(s, FOREST.light), 28, "verde da guilda nos panos, nas flâmulas, nas flechas e no telhado da torre");
  assert.equal(times(s, SHINGLE.base), 10, "telhas de madeira nas águas, na empena e nas águas-furtadas");
  for (const other of [TERRACOTTA.base, COPPER.base, MARBLE.light, CRIMSON.base, ARCANE.base]) assert.equal(times(s, other), 0, "só as cores dela");
  assert.equal(arcs(s, 22), 4, "o raio dos clarões das janelas acesas"); assert.equal(times(s, GLASS_WARM.base), 6);
});

test("Hospedaria dos Viajantes: telhado de barro, duas chaminés que fumegam, quatro janelas acesas, o toldo listrado de doze listras, a placa, duas mesas e a roda", () => {
  const s = paint("hospedaria");
  assert.equal(arcs(s, 12), 4 * 3, "quatro janelas grandes de luz quente"); assert.equal(arcs(s, 16), 1, "a roda de carroça");
  assert.equal(arcs(s, 4), 12 + 2 * 3, "as doze pontas do toldo e as janelinhas das águas-furtadas");
  assert.equal(rects(s, 6, 96), 12, "doze montantes: a parede de 352 px tem onze vãos de 32"); assert.equal(rects(s, 36, 32), 1, "a placa da cama e da caneca");
  assert.equal(rects(s, 18, 40), 2, "duas chaminés de tijolo"); assert.equal(rects(s, 24, 6), 2, "o capelo de pedra de cada chaminé"); assert.equal(rects(s, 44, 6), 2, "o tampo de cada mesa");
  assert.equal(times(s, AWNING.red), 12); assert.equal(times(s, AWNING.cream), 14, "listras vermelhas e creme do toldo, e as da roda");
  assert.equal(times(s, TERRACOTTA.base), 10, "barro nas águas, na empena, nas águas-furtadas e nas venezianas");
  for (const other of [FOREST.base, SHINGLE.base, COPPER.base, MARBLE.light]) assert.equal(times(s, other), 0);
  assert.ok(s.raw.some(c => c === "rgba(217,221,228,0.5)" || c.startsWith("rgba(217,221,228,")), "a fumaça das chaminés");
});

test("Casa da Moeda e dos Mercadores: arcada de cinco arcos, quatro toldos de sete listras, o cofre, duas moedas de ouro e a balança", () => {
  const s = paint("casa-da-moeda");
  assert.equal(arcs(s, 28.4), 5, "cinco arcos de pedra na arcada"); assert.equal(arcs(s, 17), 1, "o arco do cofre"); assert.equal(arcs(s, 7), 1, "a roda da fechadura");
  assert.equal(arcs(s, 4), 4 * 7 + 2 * 3, "quatro toldos de sete listras e as janelinhas das águas-furtadas");
  assert.equal(arcs(s, 9), 4 * 3, "quatro janelas do andar de cima"); assert.equal(arcs(s, 15 * 0.74), 1, "a moeda grande sobre a cornija"); assert.equal(arcs(s, 12 * 0.74), 1, "a moeda do cata-vento");
  assert.equal(rects(s, 56.8, 12), 5, "um balcão em cada vão da arcada");
  assert.equal(times(s, AWNING.red), 16, "dois toldos vermelhos"); assert.ok(s.raw.includes("#2f5fa8"), "e dois azuis, a cor da capital");
  assert.equal(times(s, GLASS.base), 6); assert.equal(times(s, GOLD.base), 27); assert.equal(times(s, GOLD.dark), 37, "ouro nas molduras, nas moedas, na cumeeira, na balança e nos panos");
  for (const other of [FOREST.base, TERRACOTTA.base, COPPER.base, SHINGLE.base]) assert.equal(times(s, other), 0);
});

test("Templo da Concórdia: telhado de cobre, quatro colunas sob o frontão do sol, seis vitrais, campanário com sino e sol, dois braseiros acesos", () => {
  const s = paint("templo");
  assert.equal(rects(s, 9, 96), 4, "as quatro colunas do pórtico"); assert.equal(arcs(s, 8.5), 1, "o sol do frontão"); assert.equal(arcs(s, 8), 1, "o sol de ouro no alto da agulha");
  assert.equal(arcs(s, 9), 1, "o círculo do sol no campanário"); assert.equal(arcs(s, 28), 6, "o clarão de cada um dos seis vitrais das naves");
  assert.equal(arcs(s, 48), 2, "o clarão dos dois braseiros"); assert.equal(arcs(s, 10), 3, "as três janelas de arco redondo");
  assert.equal(times(s, COPPER.base), 7); assert.equal(times(s, COPPER.light), 4, "cobre no telhado de quatro águas, na empena e na agulha");
  assert.equal(times(s, MARBLE.light), 10); assert.equal(times(s, GLASS_WARM.base), 5); assert.equal(times(s, GLASS.base), 4);
  for (const color of ["#e8541c", "#ffa11f", "#ffe27a"]) assert.equal(times(s, color), 2, `chama ${color} nos dois braseiros`);
  for (const other of [FOREST.base, TERRACOTTA.base, SHINGLE.base]) assert.equal(times(s, other), 0);
});

test("parede de madeira aparente: montantes a cada 32 px, travessas, mãos-francesas só nos vãos pares, soco e contorno", () => {
  const s = spy(c => new TimberKit(c).halfTimber(0, 128, -60, 0, 3));
  assert.equal(rects(s, 6, 60), 5, "cinco montantes de 6 px (quatro vãos de 32)");
  assert.equal(rects(s, 128, 6), 3, "três travessas"); assert.deepEqual(s.args.strokeRect!.at(-1), [0, -60, 128, 60], "o contorno fecha a parede");
  assert.equal(s.calls.clip, 1); assert.equal(s.calls.save, s.calls.restore);
  assert.ok((s.args.fillRect ?? []).some(a => a[0] === 0 && a[1] === -20 && a[2] === 128 && a[3] === 20), "soco de pedra de 20 px");
  assert.equal(times(s, PLASTER.light) + times(s, TIMBER.light) > 0, true);
  const braceStarts = (e: number): number[] => (spy(c => new TimberKit(c).halfTimber(0, e, -60, 0, 3)).args.moveTo ?? []).filter(a => a[1] === -55).map(a => a[0]!).sort((a, b) => a - b);
  assert.deepEqual(braceStarts(128), [3, 29, 67, 93], "um X (duas diagonais) nos vãos 0 e 2 (x de 0 a 32 e de 64 a 96), e nenhum nos vãos 1 e 3"); assert.deepEqual(braceStarts(64), [3, 29], "de dois vãos só o 0 leva o X");
  assert.equal(rects(spy(c => new TimberKit(c).halfTimber(0, 144, -60, 0, 3)), 6, 60), 6, "144 px: o vão sai de 144 / 32 = 4,5, arredondado para 5, então seis montantes");
  assert.notEqual(signature(c => new TimberKit(c).halfTimber(0, 128, -60, 0, 3)), signature(c => new TimberKit(c).halfTimber(0, 128, -60, 0, 4)), "a variação muda as manchas de reboco");
});

test("venezianas, floreira e toldo: lados, tamanhos e listras certos", () => {
  const sh = spy(c => new TimberKit(c).shutters(100, -30, 24, 42, FOREST));
  assert.deepEqual(sh.args.fillRect, [[80, -72, 7, 42], [113, -72, 7, 42]], "uma de cada lado da janela de 24 px");
  const box = spy(c => new TimberKit(c).flowerBox(0, -20, 32, "#e8545a", "#f3d34f"));
  assert.deepEqual(box.args.fillRect![0], [-16, -20, 32, 7]); assert.equal(box.calls.ellipse, 5 * 3, "cinco tufos (32 / 7 arredondado), de três manchas cada"); assert.equal(spy(c => new TimberKit(c).flowerBox(0, 0, 10, "#fff", "#000")).calls.ellipse, 3 * 3, "no mínimo três tufos"); assert.ok(box.raw.includes("#e8545a") && box.raw.includes("#f3d34f"));
  const aw = spy(c => new TimberKit(c).awning(0, 64, -50, 20));
  assert.equal(times(aw, AWNING.red), 8); assert.equal(times(aw, AWNING.cream), 8, "oito listras de 8 px, alternadas, cada uma pintada duas vezes (o pano e a ponta redonda)");
  assert.equal(arcs(aw, 4), 8, "uma ponta redonda em cada listra"); assert.deepEqual(aw.args.strokeRect![0], [0, -51.4, 64, 3]);
  const wide = spy(c => new TimberKit(c).awning(0, 100, -50, 20, "#2f5fa8", "#ffffff"));
  assert.equal(times(wide, "#2f5fa8"), 14); assert.equal(times(wide, "#ffffff"), 12, "treze listras (100 / 8 arredondado), a primeira na cor de cima: o número vem da largura");
});

test("arcada, placa, e as peças pequenas (barril, caixote, saco, feno, chama e fumaça)", () => {
  const ar = spy(c => new TimberKit(c).arcade(0, 200, -50, 0, 4, { light: "#eee", base: "#bbb", dark: "#777" }));
  assert.equal(arcs(ar, 21), 4, "quatro arcos de (50 − 8) / 2 px"); assert.equal(rects(ar, 42, 12), 4, "um balcão em cada vão");
  const sign = spy(c => new TimberKit(c).hangingSign(0, -40, 40, 30, TERRACOTTA));
  assert.deepEqual(sign.args.fillRect, [[-20, -33, 40, 30]]); assert.deepEqual(sign.args.strokeRect, [[-20, -33, 40, 30], [-21, -34, 42, 32]]);
  assert.equal(rects(spy(c => new TimberKit(c).crate(0, 0, 16)), 16, 16), 1);
  assert.equal(rects(spy(c => new TimberKit(c).hay(0, 0)), 26, 14), 1);
  const barrel = spy(c => new TimberKit(c).barrel(0, 0)); assert.equal(barrel.calls.quadraticCurveTo, 2); assert.equal(barrel.calls.ellipse, 1, "o tampo");
  assert.equal(spy(c => new TimberKit(c).sack(0, 0)).calls.quadraticCurveTo, 2);
  const flame = spy(c => new TimberKit(c).flame(0, 0, 20));
  assert.equal(flame.calls.quadraticCurveTo, 6, "três línguas de duas curvas"); assert.equal(flame.calls.createRadialGradient, 1, "o clarão"); assert.equal(flame.calls.save, flame.calls.restore);
  const smoke = spy(c => new TimberKit(c).smoke(0, 0));
  assert.deepEqual((smoke.args.ellipse ?? []).map(a => [a[0], a[1]]), [[0, 0], [3.4, -11], [6.8, -22], [10.2, -33]], "quatro sopros subindo e andando para a direita");
  assert.ok(smoke.raw.length === 4 && new Set(smoke.raw).size === 4, "cada um mais claro que o de baixo");
});
