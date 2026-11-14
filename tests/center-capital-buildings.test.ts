import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { BUILDING_PAD, CAPITAL_BUILDING_ART, buildingBox, capitalBuildingArtFor } from "../src/render/center/capital/buildings/index.ts";
import { HallKit } from "../src/render/center/capital/buildings/kit.ts";
import { ARCANE, CRIMSON, SLATE_ARCANE, STRAW, TERRACE } from "../src/render/center/capital/buildings/palette.ts";
import { CAPITAL_PROP_ART } from "../src/render/center/capital/props/index.ts";
import { capitalBuildingSprite, capitalBuildingSpriteKey } from "../src/render/center/capital/sceneryPainter.ts";
import { CAPITAL_WARM_MARGIN, warmCapitalSprites } from "../src/render/center/capital/warm.ts";
import { GOLD, ROYAL, SLATE, type Point } from "../src/render/center/kit/index.ts";
import { warmRegionSprites } from "../src/render/props/registry.ts";
import { RES, hasSprite } from "../src/render/props/spriteCache.ts";
import { clearSceneryCache, renderScenery, type Scenery } from "../src/render/scenery.ts";
import { WorldRenderer } from "../src/render/WorldRenderer.ts";
import { BUILDING_MARGIN, BUILDING_RISE, CAPITAL, CAPITAL_BUILDINGS, CAPITAL_BUILT, CAPITAL_PLOTS, CAPITAL_PROPS, CAPITAL_PROP_REACH, capitalBuildingBlocks, capitalGround, capitalPoint, capitalPropsInView,
  doorApproach, inPlot } from "../src/world/center/capital/index.ts";
import { canMoveOnSeed } from "../src/world/collision.ts";
import { Recorder } from "./helpers/recordingContext.ts";
import { withDocument } from "./helpers/paintChunk.ts";
import { signature, spy, type Spy } from "./helpers/spyContext.ts";

/**
 * Cidadela dos Povos (ADR 0058): os quatro edifícios construídos (Ordem dos Cavaleiros, Quartel da Guarda, Conselho dos Povos
 * e Academia Arcana), a colisão que entra junto com a arte de cada um, o kit de construção e o preparo dos sprites.
 */
const T = 32, SEEDS = [42, 842136, 7];
const count = (s: Spy, method: string, pick: (a: number[]) => boolean = () => true): number => (s.args[method] ?? []).filter(pick).length;
const paint = (id: string): Spy => spy(c => CAPITAL_BUILDING_ART[id]!.paint(c));
const tileCenter = (lx: number, ly: number) => capitalPoint(lx, ly);

test("os quatro edifícios construídos são os terrenos da Cidadela, com a base no meio da borda sul e o tamanho do terreno", () => {
  assert.deepEqual([...CAPITAL_BUILT], ["ordem-cavaleiros", "quartel", "conselho", "academia-arcana"]);
  assert.equal(CAPITAL_BUILDINGS.length, 4);
  assert.deepEqual(CAPITAL_PLOTS.filter(p => p.district === "cidadela").map(p => p.id).sort(), [...CAPITAL_BUILT].sort(), "a Cidadela inteira está construída");
  for (const [i, b] of CAPITAL_BUILDINGS.entries()) {
    const plot = CAPITAL_PLOTS.find(p => p.id === CAPITAL_BUILT[i])!;
    assert.equal(b.id, plot.id); assert.equal(b.plot, plot); assert.equal(b.name, plot.name);
    assert.equal(b.width, plot.w * T); assert.equal(b.depth, plot.h * T);
    assert.equal(b.x, (CAPITAL.centerX + plot.x + plot.w / 2) * T, "meio do terreno");
    assert.equal(b.y, (CAPITAL.centerY + plot.y + plot.h) * T, "borda sul do terreno");
    assert.equal(plot.door, "s", "a porta dá para a Rua da Cidadela, ao sul");
  }
});

test("o bloqueio de um edifício é o terreno inteiro mais o corpo de quem anda, com a borda exata nos quatro lados", () => {
  for (const b of CAPITAL_BUILDINGS) {
    const x0 = b.x - b.width / 2, x1 = b.x + b.width / 2, y0 = b.y - b.depth, y1 = b.y;
    assert.equal(capitalBuildingBlocks(b.x, b.y - b.depth / 2, 7), true, `${b.id}: o meio`);
    for (const r of [0, 7, 12]) {
      for (const [x, y, hit] of [[b.x, y1 + r - 0.5, true], [b.x, y1 + r, false], [b.x, y0 - r + 0.5, true], [b.x, y0 - r, false],
        [x0 - r + 0.5, b.y - 40, true], [x0 - r, b.y - 40, false], [x1 + r - 0.5, b.y - 40, true], [x1 + r, b.y - 40, false]] as const)
        assert.equal(capitalBuildingBlocks(x, y, r), hit, `${b.id} r=${r} em ${x - b.x},${y - b.y}`);
    }
    for (const [x, y] of [[x0 + 1, y0 + 1], [x1 - 1, y0 + 1], [x0 + 1, y1 - 1], [x1 - 1, y1 - 1]] as const) assert.equal(capitalBuildingBlocks(x, y, 0), true, `${b.id}: canto`);
  }
  for (const p of CAPITAL_PLOTS.filter(p => !CAPITAL_BUILT.includes(p.id as never))) {
    const c = tileCenter(p.x + Math.floor(p.w / 2), p.y + Math.floor(p.h / 2));
    assert.equal(capitalBuildingBlocks(c.x, c.y, 7), false, `${p.id} ainda não tem edifício`);
  }
  assert.equal(capitalBuildingBlocks(0, 0, 7), false, "na vila");
  assert.equal(capitalBuildingBlocks(Number.NaN, 0, 7), true); assert.equal(capitalBuildingBlocks(0, 0, Number.POSITIVE_INFINITY), true);
});

test("no jogo, todo tile dos quatro edifícios bloqueia o herói; a frente da porta, as ruas em volta e os terrenos sem edifício seguem livres", () => {
  for (const seed of SEEDS) {
    let solid = 0, ring = 0, open = 0;
    for (const b of CAPITAL_BUILDINGS) {
      const p = b.plot;
      for (let ly = p.y; ly < p.y + p.h; ly++) for (let lx = p.x; lx < p.x + p.w; lx++) { const c = tileCenter(lx, ly); assert.equal(canMoveOnSeed(c.x, c.y, seed), false, `${p.id} livre em ${lx},${ly}`); solid++; }
      const [ax, ay] = doorApproach(p), a = tileCenter(ax, ay);
      assert.equal(canMoveOnSeed(a.x, a.y, seed), true, `a frente da porta de ${p.id}`);
      assert.equal(canMoveOnSeed(a.x, a.y - T / 2 + 7, seed), true, "dá para encostar na porta");
      assert.equal(canMoveOnSeed(a.x, a.y - T / 2 + 6, seed), false, "mas não entrar na parede");
      // o anel de tiles em volta do terreno: onde é rua, o herói passa
      for (let ly = p.y - 1; ly <= p.y + p.h; ly++) for (let lx = p.x - 1; lx <= p.x + p.w; lx++) {
        if (inPlot(p, lx, ly) || capitalGround(CAPITAL.centerX + lx, CAPITAL.centerY + ly) !== "path") continue;
        const c = tileCenter(lx, ly); assert.equal(canMoveOnSeed(c.x, c.y, seed), true, `rua ao lado de ${p.id} em ${lx},${ly}`); ring++;
      }
    }
    for (const p of CAPITAL_PLOTS.filter(p => !CAPITAL_BUILT.includes(p.id as never)))
      for (let ly = p.y; ly < p.y + p.h; ly++) for (let lx = p.x; lx < p.x + p.w; lx++) { const c = tileCenter(lx, ly); assert.equal(canMoveOnSeed(c.x, c.y, seed), true, `${p.id} bloqueado em ${lx},${ly} sem ter arte`); open++; }
    assert.equal(solid, 12 * 11 + 18 * 11 + 18 * 11 + 11 * 11);
    assert.ok(ring > 150, `ruas em volta conferidas: ${ring}`); assert.ok(open > 1500, `tiles de terrenos sem edifício: ${open}`);
    for (let ly = CAPITAL.minY + 1; ly <= -3; ly++) { const c = tileCenter(0, ly); assert.equal(canMoveOnSeed(c.x, c.y, seed), true, `Grande Avenida em ${ly}`); }
  }
  assert.match(readFileSync("src/world/collision.ts", "utf8"), /capitalMonumentBlocks\(x, y, radius\) \|\| capitalBuildingBlocks\(x, y, radius\)/);
});

test("cada edifício é uma peça da capital: a variação é a posição na lista e o alcance cobre o sprite inteiro", () => {
  const props = CAPITAL_PROPS.filter(p => p.kind === "building");
  assert.equal(props.length, 4);
  for (const [i, b] of CAPITAL_BUILDINGS.entries()) {
    const prop = props[i]!, art = CAPITAL_BUILDING_ART[b.id]!;
    assert.deepEqual([prop.x, prop.y, prop.variant, prop.id], [b.x, b.y, i, b.id]);
    assert.deepEqual(prop.reach, { side: b.width / 2 + BUILDING_MARGIN, up: b.depth + BUILDING_RISE });
    assert.ok(art.size.rise <= BUILDING_RISE, `${b.id}: a arte sobe ${art.size.rise} px, dentro do alcance de ${BUILDING_RISE}`);
  }
  assert.ok(BUILDING_PAD.right <= BUILDING_MARGIN && BUILDING_PAD.left <= BUILDING_MARGIN, "a folga do sprite cabe no alcance dos lados");
  assert.ok(CAPITAL_PROPS.filter(p => p.kind !== "building").every(p => p.reach === undefined), "as outras peças cabem na margem fixa");
});

test("toda peça da capital que aparece na tela é entregue ao desenho, em qualquer tela e vindo de qualquer lado (nada surge de repente)", () => {
  const center = capitalPoint(0, 0);
  // a caixa de cada peça no mundo (onde o sprite pinta), tirada do cadastro de arte
  const boxes = CAPITAL_PROPS.map(p => {
    const [w, h, ox, oy] = p.kind === "building" ? buildingBox(capitalBuildingArtFor(p.variant)!.size) : CAPITAL_PROP_ART[p.kind]!.box;
    return { p, x0: p.x - ox, x1: p.x - ox + w, y0: p.y - oy, y1: p.y - oy + h };
  });
  let shown = 0, cameras = 0, empty = 0;
  for (const [W, H] of [[1280, 720], [1920, 1080], [412, 915], [2560, 1440], [3840, 2160]] as const) for (let dx = -3400; dx <= 3400; dx += 68) for (let dy = -2700; dy <= 2700; dy += 54) {
    const cameraX = center.x + dx, cameraY = center.y + dy, got = new Set(capitalPropsInView(cameraX, cameraY, W, H));
    cameras++; if (got.size === 0) empty++;
    for (const b of boxes) {
      if (!(b.x1 > cameraX - W / 2 && b.x0 < cameraX + W / 2 && b.y1 > cameraY - H / 2 && b.y0 < cameraY + H / 2)) continue;
      shown++;
      assert.ok(got.has(b.p), `${b.p.id} aparece na tela ${W}×${H} com a câmera em ${dx},${dy} e não foi entregue`);
    }
  }
  assert.ok(shown > 500_000 && cameras > 50_000, `${shown} aparições conferidas em ${cameras} câmeras`);
  assert.ok(empty > 5000, `longe da cidade nada é entregue (${empty} câmeras vazias)`);
  // a folga de cada peça comum cabe nas margens fixas; os edifícios trazem a deles
  for (const p of CAPITAL_PROPS.filter(p => p.kind !== "building")) {
    const [w, h, ox, oy] = CAPITAL_PROP_ART[p.kind]!.box;
    assert.ok(ox <= CAPITAL_PROP_REACH.side && w - ox <= CAPITAL_PROP_REACH.side && oy <= CAPITAL_PROP_REACH.up && h - oy <= CAPITAL_PROP_REACH.down, `${p.kind} cabe nas margens`);
  }
  assert.deepEqual(CAPITAL_PROP_REACH, { side: 235, up: 200, down: 200 });
  // barato e seguro: longe, ou com números inválidos, não examina nem entrega nada
  const spanX = (40 + 1) * T + CAPITAL_PROP_REACH.side, spanY = (32 + 1) * T + CAPITAL_PROP_REACH.up;
  assert.equal(capitalPropsInView(center.x + spanX + 640, center.y, 1280, 720).length, 0); assert.ok(capitalPropsInView(center.x + spanX + 639 - 300, center.y, 1280, 720).length > 0);
  assert.equal(capitalPropsInView(center.x, center.y - spanY - 360, 1280, 720).length, 0);
  assert.equal(capitalPropsInView(0, 0, 1280, 720).length, 0, "na vila");
  for (const bad of [[Number.NaN, 0, 1280, 720], [0, Number.POSITIVE_INFINITY, 1280, 720], [center.x, center.y, 0, 720], [center.x, center.y, 1280, -1], [center.x, center.y, Number.NaN, 720]] as const)
    assert.deepEqual(capitalPropsInView(bad[0], bad[1], bad[2], bad[3]), []);
  assert.equal(capitalPropsInView(center.x, center.y, 8000, 6000).length, CAPITAL_PROPS.length, "com a cidade toda na tela, todas as peças");
  // o edifício entra enquanto alguma parte dele pode aparecer (por baixo e pelos lados) e deixa de entrar quando some
  const seen = (cameraX: number, cameraY: number, i: number): boolean => capitalPropsInView(cameraX, cameraY, 1280, 720).some(p => p.kind === "building" && p.variant === i);
  for (const [i, b] of CAPITAL_BUILDINGS.entries()) {
    // para os lados vale a maior entre a margem fixa das peças e o alcance do edifício
    const up = b.depth + BUILDING_RISE, side = Math.max(CAPITAL_PROP_REACH.side, b.width / 2 + BUILDING_MARGIN), [bw, bh, ox, oy] = buildingBox(CAPITAL_BUILDING_ART[b.id]!.size);
    assert.equal(seen(b.x, b.y - 100, i), true, `${b.id}: de frente`);
    assert.equal(seen(b.x, b.y - 360 - up + 1, i), true, `${b.id}: só o telhado pode aparecer`); assert.equal(seen(b.x, b.y - 360 - up, i), false, `${b.id}: já passou inteiro`);
    assert.equal(seen(b.x + 640 + side - 1, b.y - 100, i), true); assert.equal(seen(b.x + 640 + side, b.y - 100, i), false);
    assert.equal(seen(b.x - 640 - side + 1, b.y - 100, i), true); assert.equal(seen(b.x - 640 - side, b.y - 100, i), false);
    assert.equal(seen(b.x, b.y + 360 + CAPITAL_PROP_REACH.down - 1, i), true); assert.equal(seen(b.x, b.y + 360 + CAPITAL_PROP_REACH.down, i), false);
    assert.ok(bw - ox <= side && ox <= side && oy <= up && bh - oy <= CAPITAL_PROP_REACH.down, `${b.id}: o sprite cabe no alcance`);
  }
});

test("o WorldRenderer entrega ao desenho exatamente as peças que a planta diz que podem aparecer, com o tipo e a variação", () => {
  const recorder = new Recorder();
  (globalThis as Record<string, unknown>).document = { createElement: () => ({ width: 0, height: 0, getContext: () => recorder.ctx }) };
  try {
    const world = new WorldRenderer(842136), council = CAPITAL_BUILDINGS[2]!;
    for (const [x, y] of [[council.x, council.y + 60], [council.x - 400, council.y - 700]] as const) {
      const got = world.objects(x, y, 1280, 720).filter(o => o.kind === "center-capital"), want = capitalPropsInView(x, y, 1280, 720);
      assert.ok(want.length > 3);
      assert.deepEqual(got.map(o => [o.capitalKind, o.x, o.y, o.variant]), want.map(p => [p.kind, p.x, p.y, p.variant]));
    }
    assert.ok(world.objects(council.x, council.y + 60, 1280, 720).some(o => o.capitalKind === "building" && o.variant === 2), "o Conselho, de frente");
  } finally { delete (globalThis as Record<string, unknown>).document; }
  assert.match(readFileSync("src/render/WorldRenderer.ts", "utf8"), /for \(const prop of capitalPropsInView\(cameraX, cameraY, width, height\)\)/);
});

test("o cadastro tem um pintor por edifício construído, com o tamanho do terreno, e a caixa do sprite sai dele", () => {
  assert.deepEqual(Object.keys(CAPITAL_BUILDING_ART).sort(), [...CAPITAL_BUILT].sort());
  for (const [i, b] of CAPITAL_BUILDINGS.entries()) {
    const art = CAPITAL_BUILDING_ART[b.id]!;
    assert.equal(art.size.width, b.width, `${b.id}: largura do terreno`); assert.equal(art.size.depth, b.depth, `${b.id}: profundidade do terreno`);
    assert.equal(capitalBuildingArtFor(i), art); assert.equal(capitalBuildingArtFor(i + 0.2), art);
    assert.deepEqual(buildingBox(art.size), [b.width + BUILDING_PAD.left + BUILDING_PAD.right, b.depth + art.size.rise + BUILDING_PAD.bottom, b.width / 2 + BUILDING_PAD.left, b.depth + art.size.rise]);
  }
  for (const bad of [-1, 4, 99, Number.NaN, Number.POSITIVE_INFINITY]) assert.equal(capitalBuildingArtFor(bad), undefined, String(bad));
  assert.deepEqual(readdirSync(new URL("../src/render/center/capital/buildings/", import.meta.url)).map(f => f.replace(/\.ts$/, "")).sort(), ["academy", "barracks", "council", "index", "kit", "knights", "palette"]);
  for (const f of ["academy", "barracks", "council", "kit", "knights", "palette"]) for (const bad of ["Math.random", "Date.now", "performance.now", "new Date(", "render/south", "world/south"])
    assert.equal(readFileSync(`src/render/center/capital/buildings/${f}.ts`, "utf8").includes(bad), false, `${f}: ${bad}`);
});

test("cada edifício tem um desenho próprio, estável, com save e restore em par, e tudo o que pinta cabe no sprite", () => {
  const sigs = CAPITAL_BUILT.map(id => signature(c => CAPITAL_BUILDING_ART[id]!.paint(c)));
  assert.equal(new Set(sigs).size, 4, "quatro desenhos diferentes");
  assert.deepEqual(CAPITAL_BUILT.map(id => signature(c => CAPITAL_BUILDING_ART[id]!.paint(c))), sigs, "estável");
  for (const id of CAPITAL_BUILT) {
    const art = CAPITAL_BUILDING_ART[id]!, [w, h, ox, oy] = buildingBox(art.size), s = paint(id);
    const r = new Recorder(); art.paint(r.ctx); assert.equal(r.metrics().saves, r.metrics().restores, `${id}: save e restore`);
    const inside = (x: number, y: number, what: string): void => assert.ok(x >= -ox - 0.01 && x <= w - ox + 0.01 && y >= -oy - 0.01 && y <= h - oy + 0.01, `${id}: ${what} em ${x},${y} fora do sprite (${-ox}..${w - ox}, ${-oy}..${h - oy})`);
    for (const a of s.args.fillRect ?? []) { inside(a[0]!, a[1]!, "retângulo"); inside(a[0]! + a[2]!, a[1]! + a[3]!, "retângulo"); }
    for (const m of ["moveTo", "lineTo"]) for (const a of s.args[m] ?? []) inside(a[0]!, a[1]!, m);
    for (const a of s.args.arc ?? []) { inside(a[0]! - a[2]!, a[1]! - a[2]!, "círculo"); inside(a[0]! + a[2]!, a[1]! + a[2]!, "círculo"); }
    for (const a of s.args.ellipse ?? []) { inside(a[0]! - a[2]!, a[1]! - a[3]!, "elipse"); inside(a[0]! + a[2]!, a[1]! + a[3]!, "elipse"); }
    // o telhado chega ao fundo do terreno e a parede da frente começa no chão
    const ys = (s.args.fillRect ?? []).map(a => a[1]!);
    assert.ok(Math.min(...ys) <= -art.size.depth, `${id}: cobre o terreno até o fundo`);
    assert.ok((s.args.fillRect ?? []).some(a => a[1]! + a[3]! === 0 && a[2]! >= 60), `${id}: a parede da frente pisa no chão`);
  }
});

test("o que distingue cada edifício: colunata e cúpula azul no Conselho, terraço e ameias no Quartel, vermelho na Ordem, violeta na Academia", () => {
  const council = paint("conselho"), barracks = paint("quartel"), knights = paint("ordem-cavaleiros"), academy = paint("academia-arcana");
  const uses = (s: Spy, color: string): boolean => s.raw.includes(color);
  // Conselho: seis colunas de 98 px, a cúpula azul-real com nervuras douradas, dois sóis (frontão e cúpula) e oito janelas altas
  assert.equal(count(council, "fillRect", a => a[2] === 9 && a[3] === 90), 6, "seis colunas");
  assert.equal(count(council, "arc", a => a[2] === 6.5), 2, "o sol do frontão e o do alto da cúpula");
  assert.equal(count(council, "arc", a => a[2] === 10), 8 * 3, "oito janelas altas de arco redondo nas alas (vidro, recorte e contorno)");
  assert.ok(uses(council, ROYAL.base) && uses(council, GOLD.base) && uses(council, SLATE.base));
  assert.equal(council.calls.bezierCurveTo, 6, "o perfil da cúpula (três passadas de duas curvas)");
  // Quartel: 36 ameias na frente e 9 na torre de menagem, oito frestas no muro, duas na torre e três em cada torre de canto
  assert.equal(count(barracks, "fillRect", a => a[2] === 10 && a[3] === 11), 36 + 9);
  assert.equal(count(barracks, "arc", a => a[2] === 2.4), 8 + 2 + 6);
  assert.ok(uses(barracks, TERRACE.light) && uses(barracks, STRAW.base), "terraço de lajes e bonecos de palha");
  assert.equal(count(barracks, "arc", a => a[2] === 28), 2, "o arco do portão de 56 px (o vão e o contorno)");
  // Ordem: a rosácea de oito gomos, as estátuas e o vermelho; Academia: o violeta, os sete cristais e nada de vermelho
  assert.equal(count(knights, "arc", a => a[2] === 17), 8 + 1, "oito gomos de vitral e o aro");
  assert.equal(count(knights, "arc", a => a[2] === 4.4), 2, "o elmo das duas estátuas");
  assert.ok(uses(knights, CRIMSON.base) || knights.raw.includes(CRIMSON.light));
  assert.equal(count(academy, "arc", a => a[2] === 16), 6, "o clarão dos seis cristais pequenos");
  assert.equal(count(academy, "arc", a => Math.abs(a[2]! - 28.8) < 1e-9), 1, "e o do cristal grande sobre a cúpula");
  assert.ok(uses(academy, ARCANE.base) && uses(academy, SLATE_ARCANE.base));
  // cada cor está na peça certa: contam-se as vezes em que aparece, para uma peça não esconder a troca de cor de outra
  const times = (s: Spy, color: string): number => s.raw.filter(c => c === color).length;
  assert.equal(times(council, ROYAL.dark), 3, "azul-real nos dois estandartes e na cúpula do Conselho");
  assert.equal(times(knights, CRIMSON.light), 10, "vermelho nos quatro panos, na flâmula, no brasão e nos quatro gomos da rosácea");
  assert.equal(times(academy, SLATE.base), 0, "o telhado da Academia não é de ardósia comum");
  assert.equal(times(academy, SLATE_ARCANE.base), 8, "ardósia arroxeada nas quatro águas e nos quatro cones");
  for (const tone of [CRIMSON.light, CRIMSON.dark]) { assert.equal(uses(academy, tone), false, "a Academia não usa o vermelho da Ordem"); assert.equal(uses(council, tone), false); assert.equal(uses(barracks, tone), false); }
  for (const tone of [ARCANE.base, SLATE_ARCANE.base]) { assert.equal(uses(knights, tone), false, "a Ordem não usa o violeta da Academia"); assert.equal(uses(council, tone), false); assert.equal(uses(barracks, tone), false); }
});

test("uma água de telhado só pinta dentro do polígono, em fiadas de 7 px com juntas alternadas, sem recorte e com um único traçado", () => {
  // dentro do polígono convexo, com 1,5 px de folga: uma linha de fiada de 1 px encosta na aresta inclinada
  const side = (p: Point, q: Point, x: number, y: number): number => ((q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0])) / Math.hypot(q[0] - p[0], q[1] - p[1]);
  const inside = (pts: readonly Point[], x: number, y: number): boolean => { const d = pts.map((p, i) => side(p, pts[(i + 1) % pts.length]!, x, y)); return d.every(v => v >= -1.5) || d.every(v => v <= 1.5); };
  const cases: Array<[string, Point[], "h" | "v", 1 | -1]> = [
    ["frente", [[-100, 0], [-40, -70], [40, -70], [100, 0]], "h", 1], ["trás", [[-100, -140], [100, -140], [40, -70], [-40, -70]], "h", -1],
    ["esquerda", [[-100, -140], [-40, -70], [-100, 0]], "v", -1], ["direita", [[100, -140], [100, 0], [40, -70]], "v", 1],
  ];
  for (const [name, pts, rows, bulge] of cases) {
    const s = spy(c => new HallKit(c).slope(pts, "#56668a", rows, bulge, 3));
    assert.equal(s.calls.clip ?? 0, 0, `${name}: sem recorte`); assert.equal(s.calls.stroke, 1, `${name}: só o contorno é traçado`); assert.equal(s.calls.fill, 1);
    const rects = s.args.fillRect ?? [];
    assert.ok(rects.length > 60, `${name}: ${rects.length} retângulos`);
    for (const [x, y, w, h] of rects as number[][]) for (const [px, py] of [[x!, y!], [x! + w!, y!], [x!, y! + h!], [x! + w!, y! + h!]] as const)
      assert.ok(inside(pts, px, py), `${name}: retângulo em ${x},${y} (${w}×${h}) sai da água`);
    // fiadas: uma linha de sombra a cada 7 px, ao longo do eixo em que as fiadas se empilham
    const lines = rects.filter(a => (rows === "h" ? a[3] === 1 && a[2]! > 20 : a[2] === 1 && a[3]! > 20)).map(a => (rows === "h" ? a[1]! : a[0]!));
    const steps = [...new Set(lines)].sort((a, b) => a - b);
    assert.ok(steps.length >= 14, `${name}: ${steps.length} linhas`);
    // juntas: tracinhos de 5 px, alternados de meia telha de uma fiada para a outra
    const joints = rects.filter(a => (rows === "h" ? a[2] === 1 && a[3] === 5 : a[2] === 5 && a[3] === 1));
    assert.ok(joints.length > 40, `${name}: ${joints.length} juntas`);
    const byRow = new Map<number, number[]>();
    for (const a of joints) { const key = rows === "h" ? a[1]! : a[0]!, at = rows === "h" ? a[0]! : a[1]!; byRow.set(key, [...(byRow.get(key) ?? []), at]); }
    const phases = [...byRow.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => ((v[0]! % 8) + 8) % 8);
    for (let i = 1; i < phases.length; i++) assert.equal(Math.abs(phases[i]! - phases[i - 1]!), 4, `${name}: fiadas vizinhas alternam meia telha`);
    for (const v of byRow.values()) for (let i = 1; i < v.length; i++) assert.equal(v[i]! - v[i - 1]!, 8, `${name}: uma junta a cada 8 px`);
    assert.equal(signature(c => new HallKit(c).slope(pts, "#56668a", rows, bulge, 3)), signature(c => new HallKit(c).slope(pts, "#56668a", rows, bulge, 3)));
    assert.notEqual(signature(c => new HallKit(c).slope(pts, "#56668a", rows, bulge, 3)), signature(c => new HallKit(c).slope(pts, "#56668a", rows, bulge, 4)), "a variação muda as ardósias de tom próprio");
  }
});

test("o telhado de quatro águas tem a de trás, as dos lados, a da frente, espigões e cumeeira; com recuo zero vira duas águas", () => {
  const hip = spy(c => { const r = new HallKit(c).hipRoof(-100, 100, -40, -200, 3); assert.equal(r.ridge, -200 + 160 * 0.42); assert.equal(r.left, -106 + Math.min(212 * 0.3, 80)); assert.equal(r.right, -r.left); });
  assert.equal(hip.calls.fill, 4, "quatro águas");
  const gable = spy(c => { const r = new HallKit(c).hipRoof(-100, 100, -40, -200, 3, SLATE, 0); assert.equal(r.left, -106); assert.equal(r.right, 106); });
  assert.equal(gable.calls.fill, 2, "duas águas");
  assert.equal(hip.calls.stroke! - gable.calls.stroke!, 2 + 8, "os dois contornos a mais e os quatro espigões (sombra e capote)");
  const front = spy(c => new HallKit(c).gableRoof(-50, 50, -40, -200, 30, 3));
  assert.equal(front.calls.fill, 2); assert.equal(front.calls.clip ?? 0, 0);
  assert.ok((front.args.lineTo ?? []).some(a => a[0] === 0 && a[1] === -70), "a cumeeira fica 30 px acima dos beirais, no meio");
});

test("as peças do kit: parede com soco e contorno, janela redonda e em ogiva, porta, coluna, ameias no compasso e a fresta", () => {
  const wall = spy(c => new HallKit(c).ashlar(-80, 80, -64, 0, 3));
  assert.deepEqual(wall.args.strokeRect!.at(-1), [-80, -64, 160, 64], "o contorno fecha a parede");
  assert.ok((wall.args.fillRect ?? []).some(a => a[0] === -80 && a[1] === -10 && a[2] === 160 && a[3] === 10), "soco de granito de 10 px");
  assert.equal(wall.calls.save, wall.calls.restore);
  assert.notEqual(signature(c => new HallKit(c).ashlar(-80, 80, -64, 0, 3)), signature(c => new HallKit(c).ashlar(-80, 80, -64, 0, 4)), "a variação muda as pedras e o desgaste");
  const round = spy(c => new HallKit(c).window(0, 0, 20, 50, ROYAL)), pointed = spy(c => new HallKit(c).window(0, 0, 20, 50, ROYAL, true));
  assert.ok(count(round, "arc", a => a[2] === 10) >= 3 && count(pointed, "arc") === 0, "arco redondo de 10 px; a ogiva não usa arco");
  assert.ok((pointed.calls.quadraticCurveTo ?? 0) >= 6, "a ogiva é feita de duas curvas por passada");
  assert.ok(round.raw.includes(ROYAL.light) && round.raw.includes(ROYAL.dark), "o vidro em degradê");
  const door = spy(c => new HallKit(c).door(0, 0, 40, 50));
  assert.equal(count(door, "arc", a => a[2] === 2.2), 2, "duas argolas"); assert.equal(count(door, "arc", a => a[2] === 26), 1, "o arco de pedra, 6 px além do vão");
  assert.equal(door.calls.save, door.calls.restore);
  const column = spy(c => new HallKit(c).column(0, 0, 98));
  assert.deepEqual(column.args.fillRect![0], [-4.5, -94, 9, 90]); assert.equal(column.calls.strokeRect, 3, "fuste, capitel e base");
  const crenels = spy(c => new HallKit(c).crenels(-64, 64, -40));
  assert.deepEqual((crenels.args.fillRect ?? []).filter(a => a[3] === 11).map(a => a[0]), [-61, -45, -29, -13, 3, 19, 35, 51], "uma ameia a cada 16 px, centrada no vão");
  const slit = spy(c => new HallKit(c).slit(0, 0, 20));
  assert.deepEqual(slit.args.arc, [[0, -17.6, 2.4, Math.PI, 0]]);
  const steps = spy(c => new HallKit(c).steps(-30, 30, 0, 3));
  assert.deepEqual((steps.args.fillRect ?? []).filter(a => a[3] === 3).map(a => [a[0], a[1], a[2]]), [[-45, 6, 90], [-40, 3, 80], [-35, 0, 70]], "cada degrau mais largo que o de cima");
});

test("o cenário põe cada edifício no cache, um sprite por edifício no tamanho da caixa, e edifício sem arte não desenha nada", () => {
  clearSceneryCache();
  const made: Array<{ width: number; height: number }> = [];
  const doc = { createElement: () => { const canvas = { width: 0, height: 0, getContext: () => new Recorder().ctx }; made.push(canvas); return canvas; } };
  const draw = (variant: number): Spy => spy(c => withDocument(doc, () => renderScenery(c, { kind: "center-capital", capitalKind: "building", x: 5, y: 5, variant } as unknown as Scenery, 0, 0, 0)));
  for (const [i, b] of CAPITAL_BUILDINGS.entries()) {
    assert.equal(draw(i).calls.drawImage, 1, `${b.id}: carimba o sprite`);
    const [w, h] = buildingBox(CAPITAL_BUILDING_ART[b.id]!.size);
    assert.deepEqual([made[i]!.width, made[i]!.height], [w * RES, h * RES], `${b.id}: tamanho do sprite`);
    assert.equal(hasSprite(capitalBuildingSpriteKey(i)), true);
  }
  assert.equal(made.length, 4);
  for (let i = 0; i < 4; i++) draw(i);
  assert.equal(made.length, 4, "desenhar de novo reaproveita os sprites");
  for (const bad of [4, -1, Number.NaN]) { assert.equal(draw(bad).calls.drawImage ?? 0, 0, `variação ${bad}`); assert.equal(capitalBuildingSprite(bad), undefined); }
  assert.equal(made.length, 4);
  // sem Canvas (no Node), o edifício é pintado direto no contexto
  clearSceneryCache();
  const direct = spy(c => renderScenery(c, { kind: "center-capital", capitalKind: "building", x: 5, y: 5, variant: 2 } as unknown as Scenery, 0, 0, 0));
  assert.ok((direct.calls.fillRect ?? 0) > 1000 && (direct.calls.drawImage ?? 0) === 0);
  clearSceneryCache();
});

test("os sprites dos edifícios são preparados um por quadro, só com a câmera perto da capital, antes de aparecerem", () => {
  clearSceneryCache();
  let created = 0;
  const doc = { createElement: () => { created++; return { width: 0, height: 0, getContext: () => new Recorder().ctx }; } };
  const center = capitalPoint(0, 0), edgeX = (CAPITAL.maxX + CAPITAL_WARM_MARGIN) * T, edgeY = (CAPITAL.maxY + CAPITAL_WARM_MARGIN) * T;
  withDocument(doc, () => {
    assert.equal(warmCapitalSprites(0, 0), false, "na vila"); assert.equal(warmCapitalSprites(center.x + edgeX, center.y), false, "na borda do alcance");
    assert.equal(warmCapitalSprites(center.x, center.y - edgeY), false); assert.equal(warmCapitalSprites(Number.NaN, center.y), false); assert.equal(warmCapitalSprites(center.x, Number.POSITIVE_INFINITY), false);
    assert.equal(created, 0, "longe da capital nada é pintado");
    for (let i = 0; i < 4; i++) {
      assert.equal(warmCapitalSprites(center.x + edgeX - 1, center.y - edgeY + 1), true, `quadro ${i}: pinta um`);
      assert.equal(created, i + 1, "um sprite por chamada"); assert.equal(hasSprite(capitalBuildingSpriteKey(i)), true, "na ordem da lista");
      if (i < 3) assert.equal(hasSprite(capitalBuildingSpriteKey(i + 1)), false);
    }
    assert.equal(warmCapitalSprites(center.x, center.y), false, "com todos prontos, não há o que fazer"); assert.equal(created, 4);
    // o que o preparo pintou é o mesmo sprite que o cenário carimba
    const s = spy(c => renderScenery(c, { kind: "center-capital", capitalKind: "building", x: 0, y: 0, variant: 1 } as unknown as Scenery, 0, 0, 0));
    assert.equal(s.calls.drawImage, 1); assert.equal(created, 4);
    clearSceneryCache();
    assert.equal(warmRegionSprites(0, 0), false);
    assert.equal(warmRegionSprites(center.x, center.y), true, "o cadastro das regiões chama o preparo da capital"); assert.equal(created, 5);
  });
  clearSceneryCache();
  const scene = readFileSync("src/ui/CanvasScene.ts", "utf8");
  assert.match(scene, /world\.warmAhead\(cameraX, cameraY, width, height, time\);\n[^\n]*\n  warmRegionSprites\(cameraX, cameraY\);/);
});
