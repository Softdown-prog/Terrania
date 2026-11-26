import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Inventory } from "../src/engine/character/Inventory.ts";
import { MAX_COINS } from "../src/engine/character/coins/index.ts";
import { MAX_WORLD_DROPS, PICKUP_DISTANCE, collectDrops, type LootDrop } from "../src/engine/character/loot.ts";
import { MAX_STACK } from "../src/engine/Limits.ts";
import { caveDefeatDrops } from "../src/engine/rooms/CaveLoot.ts";
import { CaveRoom } from "../src/engine/rooms/CaveRoom.ts";
import { caveEntranceInCell } from "../src/world/caves.ts";
import { CAVE_SEED, approachSlime, caveHost, runCave } from "./helpers/caveModeHost.ts";

/**
 * Relato do dono: dentro das cavernas os monstros não deixavam saque (e a lista de batalha não aparecia). Na superfície o gel e as moedas caem no chão e o
 * herói recolhe ao chegar perto; na caverna iam direto para a bolsa, sem aparecer nada. Agora a caverna segue a regra da superfície (ADR 0084).
 */
const read = (path: string): string => readFileSync(path, "utf8");
const gel = (id: string, x = 0, y = 0): LootDrop => ({ id, item: "gel", x, y });
const coin = (id: string, amount: number, x = 0, y = 0): LootDrop => ({ id, item: "coin", x, y, amount });

test("a criatura derrubada na caverna deixa o saque no chão, onde ela caiu: gel se é slime e moedas sempre (o chefe, um baú)", () => {
  const room = new CaveRoom(caveEntranceInCell(0, 0, CAVE_SEED)!);
  assert.equal(room.drops.size, 0, "caverna nova, chão vazio");
  const first = [...room.monsters.values()][0]!;
  const at = { x: first.x, y: first.y }; first.hp = 0;
  room.update(1 / 60, { x: 0, y: 0 });
  assert.equal(room.monsters.has(first.id), false);
  const dropped = [...room.drops.values()];
  assert.deepEqual(dropped.map(drop => drop.item).sort(), ["coin", "gel"], "slime: gel e moedas");
  for (const drop of dropped) assert.deepEqual({ x: drop.x, y: drop.y }, at, "no lugar em que caiu");
  assert.deepEqual(new Set(room.drops.keys()), new Set([first.id, first.id + ":coin"]));
  // sem derrubar ninguém nada se acrescenta; derrubar de novo o mesmo id não repete
  room.update(1 / 60, { x: 0, y: 0 }); assert.equal(room.drops.size, 2);
});

test("o saque tem teto como na superfície: com o chão cheio nada novo cai", () => {
  const room = new CaveRoom(caveEntranceInCell(0, 0, CAVE_SEED)!);
  for (let i = 0; i < MAX_WORLD_DROPS; i++) room.drops.set("velho" + i, gel("velho" + i));
  const mob = [...room.monsters.values()][0]!; mob.hp = 0; room.update(1 / 60, { x: 0, y: 0 });
  assert.equal(room.drops.size, MAX_WORLD_DROPS, "o teto é o do mundo");
  assert.equal(room.drops.has(mob.id + ":coin"), false);
});

test("quem não é slime só deixa moedas, e o baú do chefe vale mais que a moeda comum", () => {
  assert.deepEqual(caveDefeatDrops("dune-scorpion", "a:mob:1", 3, 4).map(drop => drop.item), ["coin"]);
  const plain = caveDefeatDrops("carrion-sandworm", "a:mob:1", 0, 0)[0]!, chest = caveDefeatDrops("carrion-sandworm", "a:boss", 0, 0)[0]!;
  assert.ok(plain.item === "coin" && chest.item === "coin" && chest.amount > plain.amount);
  assert.deepEqual(caveDefeatDrops("slime", "s", 1, 2).map(drop => drop.id), ["s", "s:coin"]);
});

test("recolher: ao alcance vai para a bolsa; mais longe fica no chão; ao sair da caverna recolhe-se tudo", () => {
  const purse = new Inventory(), drops = new Map<string, LootDrop>([["near", gel("near", 10, 0)], ["edge", coin("edge", 7, PICKUP_DISTANCE, 0)], ["far", coin("far", 5, PICKUP_DISTANCE + 1, 0)]]);
  assert.equal(collectDrops(drops, { x: 0, y: 0 }, purse), true);
  assert.deepEqual([...drops.keys()], ["far"], "só o que passa do alcance fica"); assert.equal(purse.gel, 1); assert.equal(purse.coins, 7, "no limite exato do alcance ainda recolhe");
  assert.equal(collectDrops(drops, { x: 0, y: 0 }, purse), false, "nada ao alcance, nada muda");
  assert.equal(collectDrops(drops, { x: 0, y: 0 }, purse, true), true, "ao sair, recolhe tudo"); assert.equal(drops.size, 0); assert.equal(purse.coins, 12);
});

test("bolsa cheia e carteira cheia: o que não cabe fica no chão", () => {
  const purse = new Inventory(); while (purse.addGel());
  assert.equal(purse.gel, MAX_STACK);
  const drops = new Map<string, LootDrop>([["g", gel("g")]]);
  assert.equal(collectDrops(drops, { x: 0, y: 0 }, purse), false, "bolsa de gel cheia: o gel fica"); assert.equal(drops.size, 1);
  const rich = new Inventory({ gel: 0, potion: 0, questRewardClaimed: false, coins: MAX_COINS - 3 }), pile = new Map<string, LootDrop>([["c", coin("c", 10)]]);
  assert.equal(collectDrops(pile, { x: 0, y: 0 }, rich), true); assert.equal(rich.coins, MAX_COINS);
  assert.deepEqual(pile.get("c"), coin("c", 7), "o resto das moedas fica no chão");
  assert.equal(collectDrops(pile, { x: 0, y: 0 }, rich), false, "carteira cheia não recolhe mais"); assert.equal(pile.get("c")?.item === "coin" && pile.get("c")!.amount, 7);
});

test("na caverna de verdade (pelo tickCave): o slime cai longe do herói, o saque fica no chão sem ir para a bolsa, e é recolhido ao pisar nele", () => {
  const h = caveHost("knight"), id = approachSlime(h, 200), mob = h.cave.monsters.get(id)!, gel0 = h.sim.inventory.gel, coins0 = h.sim.inventory.coins, at = { x: mob.x, y: mob.y };
  mob.hp = 0; runCave(h, 0.1);
  assert.equal(h.cave.monsters.has(id), false, "o slime caiu");
  assert.deepEqual([...h.cave.drops.keys()].sort(), [id, id + ":coin"].sort(), "o saque ficou no chão");
  assert.equal(h.sim.inventory.gel, gel0, "o gel não foi direto para a bolsa"); assert.equal(h.sim.inventory.coins, coins0, "nem as moedas");
  assert.ok(h.sim.experience > 0, "a experiência vem na hora");
  h.cave.player.x = at.x; h.cave.player.y = at.y; runCave(h, 0.05);
  assert.equal(h.cave.drops.size, 0, "recolhido ao pisar"); assert.equal(h.sim.inventory.gel, gel0 + 1, "o gel foi para a bolsa"); assert.ok(h.sim.inventory.coins > coins0, "e as moedas");
});

test("a ligação: a superfície e a caverna recolhem pela mesma regra, a caverna recolhe tudo ao sair ou trocar de andar, desenha o saque e mostra a lista de batalha", () => {
  const sim = read("src/engine/OfflineSimulation.ts"), cave = read("src/game/modes/caveMode.ts"), game = read("src/game/Game.ts"), scene = read("src/ui/CanvasScene.ts"), render = read("src/render/cave.ts"), page = read("src/app/game-page.html");
  assert.match(sim, /collectDrops\(this\.drops, this\.player, this\.inventory\)/); assert.equal(/PICKUP_DISTANCE/.test(sim), false, "a distância não é copiada na simulação");
  assert.match(cave, /collectDrops\(cave\.drops, cave\.player, host\.sim\.inventory\)/);
  assert.match(game, /collectDrops\(this\.cave\.drops,this\.cave\.player,this\.sim\.inventory,true\); \/\/ trocar de andar/); assert.match(game, /collectDrops\(this\.cave\.drops,this\.cave\.player,this\.sim\.inventory,true\); \/\/ nem sair da caverna/);
  assert.match(scene, /room\.drops\.values\(\)/); assert.match(scene, /drawCaveView\(this\.ctx,room,left,top,width,height,time,gear,weapon,playerClass,loot\)/);
  assert.match(render, /occupants\.push\(\.\.\.extras\);\s*\n\s*occupants\.sort/, "o saque se ordena em profundidade com as criaturas e o herói");
  assert.match(page, /@if \(hud\.targetCombat\(\)\) \{\s*\n\s*<section id="battleSidebar"/, "a lista de batalha aparece também na caverna");
  assert.match(page, /@if \(hud\.targetCombat\(\) && !hud\.travelNotice\(\) && !notice\(\)/, "e o painel do alvo também");
  assert.equal(/!hud\.cave\(\)/.test(page.slice(page.indexOf('id="battleSidebar"') - 60, page.indexOf('id="battleSidebar"') + 10)), false);
});
