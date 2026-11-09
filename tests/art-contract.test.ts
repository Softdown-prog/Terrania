import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { Recorder, withFakeDocument, type Metrics } from "./helpers/recordingContext.ts";
import { ASSETS, DARKEST_MAX, FLOORS, LIGHTEST_MIN, NOT_AN_ASSET, type Tier } from "./helpers/artAssets.ts";
import { renderSlime } from "../src/render/actors.ts";
import { TAU } from "../src/render/draw.ts";

/** Lista os motivos pelos quais uma peça fica abaixo do contrato (vazia = aprovada). */
function violations(m: Metrics, tier: Tier): string[] {
  const f = FLOORS[tier], out: string[] = [];
  const need = (label: string, got: number, min: number): void => {
    if (got < min) out.push(`${label}: ${got} (mínimo ${min} para "${tier}")`);
  };
  need("operações de pintura", m.paintOps, f.paintOps);
  need("cores distintas", m.colors, f.colors);
  need("gradientes", m.gradients, f.gradients);
  need("traços (contorno)", m.strokes, f.strokes);
  need("curvas/arcos", m.curves, f.curves);
  if (m.darkest > DARKEST_MAX) out.push(`sem tom escuro para contorno/sombra (mais escuro: ${m.darkest.toFixed(2)}, máx ${DARKEST_MAX})`);
  if (m.lightest < LIGHTEST_MIN) out.push(`sem tom claro para brilho (mais claro: ${m.lightest.toFixed(2)}, mín ${LIGHTEST_MIN})`);
  if (m.saves !== m.restores) out.push(`save/restore desbalanceados: ${m.saves}/${m.restores} (um restore a mais desempilha o estado de quem chamou)`);
  if (m.width <= 0 || m.height <= 0) out.push("não desenhou nada visível");
  return out;
}
const record = (draw: (ctx: CanvasRenderingContext2D) => void): Metrics => {
  const r = new Recorder();
  withFakeDocument(r, () => draw(r.ctx));
  return r.metrics();
};

for (const asset of ASSETS) {
  test(`arte: "${asset.id}" cumpre o contrato da categoria ${asset.tier}`, () => {
    const first = record(asset.draw);
    assert.deepEqual(violations(first, asset.tier), [], `${asset.id}\n${JSON.stringify(first)}`);
    // Determinismo: o mesmo desenho com os mesmos dados gera exatamente as mesmas chamadas.
    assert.equal(record(asset.draw).signature, first.signature, "desenho não determinístico");
  });
}

test("arte: o portão reprova um desenho preguiçoso (um círculo chapado)", () => {
  const lazy = record(ctx => { ctx.fillStyle = "#888888"; ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.fill(); });
  for (const tier of Object.keys(FLOORS) as Tier[]) assert.ok(violations(lazy, tier).length >= 4, `categoria ${tier} deveria reprovar`);
});

test("arte: slime ferido mantém a barra de vida junto da criatura e não desempilha o estado do chamador", () => {
  const healthy = record(ctx => renderSlime(ctx, { hp: 3, bounce: 0.2, id: "s1" }, 100, 200, {}));
  const wounded = record(ctx => renderSlime(ctx, { hp: 1, bounce: 0.2, id: "s1" }, 100, 200, {}));
  assert.equal(wounded.saves, wounded.restores);
  assert.ok(wounded.width < 60 && wounded.height < 80, `barra longe da criatura: ${wounded.width.toFixed(0)}×${wounded.height.toFixed(0)}`);
  assert.ok(wounded.height > healthy.height, "a barra de vida precisa aparecer quando o slime está ferido");
});

// ---------------------------------------------------------------- regras estáticas
const files = (dir: string): string[] => readdirSync(dir).flatMap(name => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path) : path.endsWith(".ts") ? [path] : [];
});
const stripComments = (code: string): string => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const renderFiles = [...files("src/render"), "src/ui/CanvasScene.ts"];

test("arte: o render é determinístico e 100 % procedural (sem aleatório, relógio, imagens nem rede)", () => {
  const banned: [RegExp, string][] = [
    [/Math\.random\s*\(/, "Math.random (use hashString/hash2 com semente; o mesmo id deve sair igual)"],
    [/Date\.now\s*\(|performance\.now\s*\(|new Date\s*\(/, "relógio (receba `time` por parâmetro)"],
    [/new Image\s*\(|createImageBitmap|fetch\s*\(|XMLHttpRequest/, "imagem/rede (a arte é procedural)"],
    [/["'`][^"'`\n]*\.(png|jpe?g|webp|gif|svg|avif)["'`]/i, "caminho de arquivo de imagem"],
  ];
  const found: string[] = [];
  for (const file of renderFiles) {
    const code = stripComments(readFileSync(file, "utf8"));
    for (const [pattern, reason] of banned) if (pattern.test(code)) found.push(`${file}: ${reason}`);
  }
  assert.deepEqual(found, []);
});

/** Pelo TIPO, não pelo nome: toda função exportada cujo 1º parâmetro é um Canvas é um desenhador
 *  (`render*`, `draw*`, `paint*` ou outro prefixo; parâmetro `ctx`, `c` ou outro). */
const drawersIn = (code: string): string[] =>
  [...stripComments(code).matchAll(/^export function ([A-Za-z0-9_]+)\s*\(\s*\w+\s*:\s*CanvasRenderingContext2D\b/gm)].map(m => m[1]!);

test("arte: todo desenhador exportado está registrado em tests/helpers/artAssets.ts (ou justificado)", () => {
  const registered = new Set(ASSETS.map(a => a.fn));
  const missing: string[] = [];
  for (const file of renderFiles)
    for (const name of drawersIn(readFileSync(file, "utf8")))
      if (!registered.has(name) && !(name in NOT_AN_ASSET)) missing.push(`${file}: ${name}`);
  assert.deepEqual(missing, [], "registre a peça em ASSETS (com categoria) ou explique em NOT_AN_ASSET");
});

// No new scene/composition may opt out just by adding a string to NOT_AN_ASSET.
test("arte: exceções são fechadas e exigem revisão explícita de novos pintores", () => {
  assert.deepEqual(Object.keys(NOT_AN_ASSET).sort(), [
    "drawCaveAtlas", "drawCaveView", "drawInterior", "drawWorldAtlas",
    "drawWorldView", "drawKnightTrail", "ellipse", "limb", "pill", "softShadow",
  ].sort());
});

test("arte: a varredura acha um pintor novo com qualquer nome, mas ignora comentários", () => {
  assert.deepEqual(drawersIn("export function paintSomethingNew(c: CanvasRenderingContext2D, kind: string): void {}"), ["paintSomethingNew"]);
  assert.deepEqual(drawersIn("export function stampBanner(\n  context: CanvasRenderingContext2D,\n  x: number): void {}"), ["stampBanner"]);
  assert.deepEqual(drawersIn("// export function renderFake(ctx: CanvasRenderingContext2D) {}\nexport function helper(n: number) {}"), []);
});
