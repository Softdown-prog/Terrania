import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CAPITAL, CAPITAL_BUILDINGS, CAPITAL_BUILT, CAPITAL_DECOR, CAPITAL_PLOTS, CAPITAL_PROPS, CAPITAL_TILE, CAPITAL_TREES, TREE_TRUNK_RADIUS, capitalDecorBlocks, capitalPoint, capitalPropsInView, inPlot, isCapitalStreet } from "../src/world/center/capital/index.ts";
import { CAPITAL_PROP_ART } from "../src/render/center/capital/props/index.ts";
import { SeedCollision } from "../src/world/collision.ts";

/** Vida na capital (ADR 0106): lampiões nas avenidas, bancos na praça e árvores nos terrenos que ainda não têm edifício. */
const kinds = (kind: string) => CAPITAL_DECOR.filter(prop => prop.kind === kind);
const local = (prop: { x: number; y: number }): { lx: number; ly: number } => ({ lx: Math.floor(prop.x / CAPITAL_TILE) - CAPITAL.centerX, ly: Math.floor((prop.y - 1) / CAPITAL_TILE) - CAPITAL.centerY });

test("contagem e ids: 28 lampiões, 8 bancos e uma árvore por posição da grade dos terrenos vazios, todos com id único e na lista de peças da capital", () => {
  assert.equal(kinds("lamp").length, 28); assert.equal(kinds("bench").length, 8);
  assert.equal(kinds("tree").length, CAPITAL_TREES.length); assert.ok(CAPITAL_TREES.length >= 40 && CAPITAL_TREES.length <= 120, String(CAPITAL_TREES.length));
  const ids = CAPITAL_DECOR.map(prop => prop.id);
  assert.equal(new Set(ids).size, ids.length); assert.ok(ids.every(id => typeof id === "string" && id.length > 0));
  for (const prop of CAPITAL_DECOR) assert.ok(CAPITAL_PROPS.includes(prop), prop.id);
  assert.deepEqual(CAPITAL_DECOR.map(prop => prop.kind).filter((kind, i, all) => all.indexOf(kind) === i), ["lamp", "bench", "tree"]);
});

test("as árvores só nascem nos terrenos sem edifício, dentro da grade (2 tiles das bordas), e nunca na rua nem em cima de um edifício", () => {
  const built = new Set<string>(CAPITAL_BUILT);
  for (const tree of CAPITAL_TREES) {
    const { lx, ly } = local(tree), owner = CAPITAL_PLOTS.find(plot => inPlot(plot, lx, ly));
    assert.ok(owner, `${tree.id} está num terreno`);
    assert.equal(built.has(owner!.id), false, `${tree.id} em terreno com edifício`);
    assert.ok(tree.id!.startsWith("arvore-" + owner!.id), tree.id);
    assert.ok(lx >= owner!.x + 2 && lx < owner!.x + owner!.w - 1 && ly >= owner!.y + 2 && ly < owner!.y + owner!.h - 1, `${tree.id} dentro da grade, a 2 tiles das bordas`);
    assert.equal(isCapitalStreet(lx, ly), false, `${tree.id} na rua`);
    for (const b of CAPITAL_BUILDINGS) assert.ok(!(tree.x > b.x - b.width / 2 && tree.x < b.x + b.width / 2 && tree.y > b.y - b.depth && tree.y < b.y), `${tree.id} sobre ${b.id}`);
    assert.ok([0, 1, 2].includes(tree.variant));
  }
  const used = new Set(CAPITAL_TREES.map(tree => tree.id!.split("-").slice(1, -1).join("-")));
  assert.equal(used.size, CAPITAL_PLOTS.length - CAPITAL_BUILT.length, "todo terreno vazio ganhou árvores");
  assert.ok(new Set(CAPITAL_TREES.map(tree => tree.variant)).size === 3, "as três espécies aparecem");
});

test("os lampiões ficam dentro da muralha, fora dos edifícios e da praça, nas bordas das duas avenidas; os bancos ficam em volta do monumento, dentro da praça", () => {
  for (const lamp of kinds("lamp")) {
    const { lx, ly } = local(lamp);
    assert.ok(lx > CAPITAL.minX && lx < CAPITAL.maxX && ly > CAPITAL.minY && ly < CAPITAL.maxY, `${lamp.id} dentro da muralha`);
    assert.ok(!(Math.abs(lx) <= 11 && Math.abs(ly) <= 11), `${lamp.id} fora da praça`);
    for (const b of CAPITAL_BUILDINGS) assert.ok(!(lamp.x > b.x - b.width / 2 && lamp.x < b.x + b.width / 2 && lamp.y > b.y - b.depth && lamp.y < b.y), `${lamp.id} sobre ${b.id}`);
    assert.ok(Math.abs(lx) <= 4 || Math.abs(ly) <= 2, `${lamp.id} numa avenida`);
  }
  const center = capitalPoint(0, 0);
  for (const bench of kinds("bench")) {
    const { lx, ly } = local(bench);
    assert.ok(Math.abs(lx) <= 11 && Math.abs(ly) <= 11, `${bench.id} na praça`);
    assert.ok(Math.hypot(bench.x - center.x, bench.y - center.y) > 4 * CAPITAL_TILE, `${bench.id} longe do monumento`);
    assert.ok([0, 1].includes(bench.variant));
    if (Math.abs(lx) >= 9) assert.equal(bench.variant, lx < 0 ? 0 : 1, `${bench.id}: oeste normal, leste espelhado`);
    else assert.equal(bench.variant, 0, `${bench.id}: norte e sul de frente`);
  }
});

test("só o tronco das árvores bloqueia: o pé tem 9 px de raio, a copa, os lampiões e os bancos não", () => {
  assert.equal(TREE_TRUNK_RADIUS, 9);
  for (const tree of CAPITAL_TREES.slice(0, 12)) {
    assert.equal(capitalDecorBlocks(tree.x, tree.y, 0), true, tree.id + " no pé");
    assert.equal(capitalDecorBlocks(tree.x + TREE_TRUNK_RADIUS + 6 + 1, tree.y, 6), false, tree.id + " logo ao lado (corpo do herói de 6 px)");
    assert.equal(capitalDecorBlocks(tree.x + TREE_TRUNK_RADIUS + 6 - 1, tree.y, 6), true, tree.id + " encostando");
  }
  for (const prop of [...kinds("lamp"), ...kinds("bench")]) assert.equal(capitalDecorBlocks(prop.x, prop.y, 6), false, prop.id + " não bloqueia");
  for (const bad of [NaN, Infinity]) { assert.equal(capitalDecorBlocks(bad, 0, 1), true); assert.equal(capitalDecorBlocks(0, bad, 1), true); assert.equal(capitalDecorBlocks(0, 0, bad), true); }
  assert.equal(capitalDecorBlocks(0, 0, 6), false, "longe da capital nada bloqueia");
});

test("a colisão do jogo usa o tronco: o herói não passa pelo pé de uma árvore, e as ruas continuam abertas", () => {
  const world = new SeedCollision(842136), tree = CAPITAL_TREES[0]!;
  assert.equal(world.canMove(tree.x, tree.y), false);
  assert.equal(world.canMove(tree.x, tree.y + 30), true, "um pouco à frente da árvore está livre");
  for (const [lx, ly] of [[0, 14], [0, -20], [0, 26], [0, -26], [-20, 0], [20, 0]] as const) { const p = capitalPoint(lx, ly); assert.equal(world.canMove(p.x, p.y), true, `rua ${lx},${ly}`); }
  // o lampião fica no meio-fio, onde o corpo do herói já não cabe por causa do edifício ao lado; o que importa é que ele mesmo não bloqueie nada
  for (const lamp of kinds("lamp")) assert.equal(capitalDecorBlocks(lamp.x, lamp.y, 7), false, lamp.id + " não bloqueia");
});

test("o desenho: lampião, banco e árvore têm pintor e sprite próprio com o número certo de variações, e a cena os pinta", () => {
  assert.deepEqual([CAPITAL_PROP_ART.lamp?.variants, CAPITAL_PROP_ART.bench?.variants, CAPITAL_PROP_ART.tree?.variants], [1, 2, 3]);
  for (const kind of ["lamp", "bench", "tree"]) assert.ok(CAPITAL_PROP_ART[kind]!.box.every(Number.isFinite), kind);
  const scene = readFileSync("src/render/center/capital/sceneryPainter.ts", "utf8");
  assert.match(scene, /CAPITAL_PROP_ART\[kind\]/);
  const view = capitalPropsInView(capitalPoint(0, 0).x, capitalPoint(0, 0).y + 6 * CAPITAL_TILE, 1280, 720);
  assert.ok(view.some(prop => prop.kind === "bench") && view.some(prop => prop.kind === "lamp") && view.some(prop => prop.kind === "tree"), "a praça mostra banco, lampião e árvore");
  assert.deepEqual(capitalPropsInView(0, 0, 1280, 720), [], "longe da capital nada aparece");
});

test("a cada terreno que ganha edifício as árvores dele saem sozinhas: a regra é derivada de CAPITAL_BUILT", () => {
  const source = readFileSync("src/world/center/capital/decor.ts", "utf8");
  assert.match(source, /const built = new Set<string>\(CAPITAL_BUILT\);/);
  assert.match(source, /if \(built\.has\(plot\.id\)\) continue;/);
});
