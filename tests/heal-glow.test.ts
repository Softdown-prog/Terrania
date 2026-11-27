import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { HEAL_GLOW_SECONDS, Player } from "../src/actors/Player.ts";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { POTION_GEL_PRICE } from "../src/engine/character/Inventory.ts";
import { elixirRecipe } from "../src/engine/character/south/alchemy/index.ts";
import { drinkElixir } from "../src/game/actions/south/alchemyActions.ts";
import { usePotion } from "../src/game/actions/shopActions.ts";
import type { ShopContext } from "../src/game/actions/shopContext.ts";
import { renderHealGlow } from "../src/render/healGlow.ts";

/**
 * Pedido do dono: um brilho no herói quando ele usa a poção de cura (ADR 0098). O tempo do brilho mora no `Player` (só apresentação, não vai para o save); quem o acende é
 * o uso da poção (e da Poção Maior), e o desenho em duas camadas (`renderHealGlow`) pinta o chão e a coluna por baixo do herói e a aura e as faíscas por cima.
 */
const OPEN = { canMove: () => true, speedAt: () => 1 };
type Call = { name: string; args: unknown[] };
const record = (draw: (ctx: CanvasRenderingContext2D) => void): Call[] => {
  const out: Call[] = [];
  const stub = new Proxy({}, { get: (_t, name: string) => (...args: unknown[]) => { out.push({ name, args }); return name.startsWith("create") ? { addColorStop: (...stops: unknown[]) => out.push({ name: "addColorStop", args: stops }) } : undefined; } });
  draw(stub as unknown as CanvasRenderingContext2D);
  return out;
};
const alphaOf = (color: unknown): number => Number(/rgba\(\d+, ?\d+, ?\d+, ?([\d.]+)\)/.exec(String(color))?.[1] ?? 0);
const context = (sim: OfflineSimulation, extra: Partial<ShopContext> = {}): ShopContext => ({ sim, hero: sim.player, inInterior: false, menuOpen: true, caveHeroDown: false, ...extra });
function withPotion(): OfflineSimulation {
  const sim = new OfflineSimulation(842136);
  for (let i = 0; i < POTION_GEL_PRICE; i++) sim.inventory.addGel();
  assert.equal(sim.inventory.tradeGelForPotion(), "traded"); sim.player.hp = 10;
  return sim;
}

test("o tempo do brilho: 1,6 s, desce com o tempo, nunca abaixo de zero, e começa apagado", () => {
  assert.equal(HEAL_GLOW_SECONDS, 1.6);
  const p = new Player(); assert.equal(p.healGlow, 0);
  p.healGlow = HEAL_GLOW_SECONDS; for (let i = 0; i < 5; i++) p.update(.1, { x: 0, y: 0 }, OPEN);
  assert.ok(Math.abs(p.healGlow - 1.1) < 1e-9, "desceu 0,5 s (cinco quadros de 0,1 s)");
  for (let i = 0; i < 40; i++) p.update(.1, { x: 0, y: 0 }, OPEN);
  assert.equal(p.healGlow, 0, "chegou a zero e parou");
});

test("a poção acende o brilho só quando cura de verdade, e só com os efeitos ligados", () => {
  const sim = withPotion(); const before = sim.inventory.potion;
  assert.equal(usePotion(context(sim, { caveHeroDown: true })).changed, false); assert.equal(sim.player.healGlow, 0, "herói caído não brilha");
  assert.equal(usePotion(context(sim, { effectsEnabled: false })).changed, true); assert.equal(sim.player.healGlow, 0, "com os efeitos desligados não brilha");
  const again = withPotion();
  assert.equal(usePotion(context(again)).changed, true); assert.equal(again.player.healGlow, HEAL_GLOW_SECONDS, "curou: brilha pelo tempo todo");
  assert.equal(before, 1);
  const full = new OfflineSimulation(842136); assert.equal(usePotion(context(full)).changed, false); assert.equal(full.player.healGlow, 0, "vida cheia não gasta nem brilha");
  const none = new OfflineSimulation(842136); none.player.hp = 5; assert.equal(usePotion(context(none)).changed, false); assert.equal(none.player.healGlow, 0, "sem poção não brilha");
});

test("a Poção Maior também faz brilhar; o antídoto não", () => {
  for (const [id, glows] of [["greater-potion", true], ["antidote", false]] as const) {
    const sim = new OfflineSimulation(842136); sim.player.hp = 10;
    const inv = sim.inventory as unknown as { elixirCounts: Record<string, number> }; inv.elixirCounts[id] = 1;
    sim.player.applyStatus("poison", 5);
    assert.equal(drinkElixir(context(sim), id).changed, true, id);
    assert.equal(sim.player.healGlow, glows ? HEAL_GLOW_SECONDS : 0, `${elixirRecipe(id).name}: ${glows ? "brilha" : "não brilha"}`);
    const off = new OfflineSimulation(842136); off.player.hp = 10; (off.inventory as unknown as { elixirCounts: Record<string, number> }).elixirCounts[id] = 1; off.player.applyStatus("poison", 5);
    drinkElixir(context(off, { effectsEnabled: false }), id); assert.equal(off.player.healGlow, 0, "efeitos desligados");
  }
});

test("o desenho: tempo vazio, vencido ou inválido não pinta nada", () => {
  for (const layer of ["back", "front"] as const) {
    for (const seconds of [0, -1, Number.NaN, Infinity * 0]) assert.deepEqual(record(c => renderHealGlow(c, 0, 0, 1, seconds, layer)), [], `${layer}: ${seconds}`);
    assert.deepEqual(record(c => renderHealGlow(c, 0, 0, Number.NaN, 1, layer)), [], `${layer}: tempo inválido`);
    assert.deepEqual(record(c => renderHealGlow(c, 0, 0, 1, 1, layer, Number.NaN)), [], `${layer}: altura inválida`);
    assert.ok(record(c => renderHealGlow(c, 0, 0, 1, 1, layer)).length > 10, `${layer}: pinta`);
  }
});

test("a camada de baixo pinta o chão (poça, dois anéis que se abrem e a coluna de luz) e a de cima, a aura e as faíscas em cruz", () => {
  const back = record(c => renderHealGlow(c, 10, 20, 1, 1.2, "back")), front = record(c => renderHealGlow(c, 10, 20, 1, 1.2, "front"));
  assert.equal(back.filter(c => c.name === "createRadialGradient").length, 1, "uma poça de luz");
  assert.equal(back.filter(c => c.name === "createLinearGradient").length, 1, "uma coluna de luz");
  assert.equal(back.filter(c => c.name === "stroke").length, 2, "dois anéis");
  assert.equal(back.filter(c => c.name === "quadraticCurveTo").length, 2, "a coluna tem duas bordas curvas");
  assert.equal(front.filter(c => c.name === "createRadialGradient").length, 1, "a aura");
  assert.equal(front.filter(c => c.name === "stroke").length, 9, "nove faíscas em cruz");
  assert.equal(front.filter(c => c.name === "lineTo").length, 18, "dois traços por faísca");
  assert.deepEqual(back[1]!.args, [10, 20], "ancorado nos pés do herói");
  const lifted = record(c => renderHealGlow(c, 10, 20, 1, 1.2, "front", 12)).filter(c => c.name === "translate");
  assert.deepEqual(lifted.map(c => c.args), [[10, 20], [0, -12]], "a aura sobe com a montaria");
  assert.equal(back.filter(c => c.name === "translate").length, 1, "o chão não sobe");
});

test("o brilho entra com clarão, sobe e se apaga: o clarão só nos primeiros instantes, a aura some no fim, as faíscas sobem", () => {
  const flash = (seconds: number) => record(c => renderHealGlow(c, 0, 0, 1, seconds, "front")).filter(c => c.name === "ellipse" && Number(c.args[2]) === 15).length;
  assert.equal(flash(HEAL_GLOW_SECONDS - .05), 1, "no começo há clarão"); assert.equal(flash(1.3), 0, "depois dos primeiros instantes não"); assert.equal(flash(1), 0);
  const top = (seconds: number) => Math.min(...record(c => renderHealGlow(c, 0, 0, 1, seconds, "front")).filter(c => c.name === "moveTo").map(c => Number(c.args[1])));
  assert.ok(top(1.2) < top(1.5), "as faíscas mais altas sobem com o tempo");
  const aura = (seconds: number) => Math.max(...record(c => renderHealGlow(c, 0, 0, 1, seconds, "front")).filter(c => c.name === "addColorStop").map(c => alphaOf(c.args[1])));
  assert.ok(aura(1) > aura(.3) && aura(.3) > aura(.05), "a aura se apaga nos últimos instantes");
  assert.ok(aura(.05) < .1, "e some no fim");
  const pool = (seconds: number) => Math.max(...record(c => renderHealGlow(c, 0, 0, 1, seconds, "back")).filter(c => c.name === "addColorStop").map(c => alphaOf(c.args[1])));
  assert.ok(pool(1) > pool(.05), "a poça do chão também se apaga");
  const ringWidth = (seconds: number) => record(c => renderHealGlow(c, 0, 0, 1, seconds, "back")).filter(c => c.name === "ellipse" && Number(c.args[0]) === 0 && Number(c.args[1]) === 2 && c.args.length === 7).map(c => Number(c.args[2]));
  const widths = (s: number) => ringWidth(s)[1]!; // o [0] é a poça, que não se mexe
  assert.ok(widths(.4) > widths(1.4), "os anéis se abrem com o tempo");
  assert.ok(ringWidth(.4)[2]! < ringWidth(.4)[1]!, "o segundo anel vem atrás do primeiro");
});

test("a ligação: a superfície e a caverna desenham o brilho nas duas camadas, o chão antes do herói e a aura depois", () => {
  const scene = readFileSync("src/ui/CanvasScene.ts", "utf8"), cave = readFileSync("src/render/cave.ts", "utf8");
  assert.match(scene, /if\(glow>0\)renderHealGlow\(ctx,player\.x-left,player\.y-top,time,glow,"back"\);/);
  assert.match(scene, /if\(glow>0\)renderHealGlow\(ctx,player\.x-left,player\.y-top,time,glow,"front",mount\?mountRiderLift\(mount\):0\);/);
  assert.ok(scene.indexOf('glow,"back"') < scene.indexOf("renderHero(ctx,") && scene.indexOf("renderHero(ctx,") < scene.indexOf('glow,"front"'), "superfície: chão, herói, aura");
  assert.match(cave, /if\(player\.healGlow>0\)renderHealGlow\(ctx,player\.x-left,player\.y-top,time,player\.healGlow,"back"\)/);
  assert.match(cave, /if\(player\.healGlow>0\)renderHealGlow\(ctx,player\.x-left,player\.y-top,time,player\.healGlow,"front"\)/);
  assert.ok(cave.indexOf('player.healGlow,"back"') < cave.indexOf("renderHero(ctx,") && cave.indexOf("renderHero(ctx,") < cave.indexOf('player.healGlow,"front"'), "caverna: chão, herói, aura");
  const game = readFileSync("src/game/Game.ts", "utf8");
  assert.match(game, /effectsEnabled: this\.effects\.enabled/, "a opção de efeitos chega às ações");
});
