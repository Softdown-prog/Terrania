import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { MAGE, manaMeter, sameManaMeter } from "../src/engine/character/classes/index.ts";
import { STAVES } from "../src/engine/character/Staves.ts";

/**
 * A barra de mana na tela (ADR 0071): o Mago vê a mana (número inteiro, máximo e porcentagem) e um aviso quando ela não chega para uma
 * magia; o Cavaleiro não tem barra; o HUD só se redesenha quando o que se vê muda.
 */
const SEED = 842136, COST = STAVES.apprentice.manaCost;
const read = (path: string): string => readFileSync(path, "utf8");

test("a leitura da barra: número inteiro, máximo, porcentagem e aviso de pouca mana", () => {
  assert.deepEqual(manaMeter(50, 50, COST), { current: 50, max: 50, percent: 100, low: false });
  assert.deepEqual(manaMeter(32.9, 50, COST), { current: 32, max: 50, percent: 64, low: false }, "o número mostrado é inteiro, sem arredondar para cima");
  assert.deepEqual(manaMeter(0, 50, COST), { current: 0, max: 50, percent: 0, low: true });
  assert.equal(manaMeter(4.99, 50, COST)!.low, true, "um tico abaixo do custo: não dá para conjurar");
  assert.equal(manaMeter(5, 50, COST)!.low, false, "exatamente o custo: dá");
  assert.equal(manaMeter(5.01, 50, COST)!.low, false);
  assert.deepEqual(manaMeter(500, 50, COST), { current: 50, max: 50, percent: 100, low: false }, "acima do máximo vale o máximo");
  for (const bad of [Number.NaN, -3, Number.NEGATIVE_INFINITY]) assert.deepEqual(manaMeter(bad, 50, COST)!.current, 0, `mana ${bad}`);
  assert.equal(manaMeter(Number.NaN, 50, COST)!.low, false, "mana inválida não acende o aviso (não há o que comparar)");
  assert.equal(manaMeter(Number.POSITIVE_INFINITY, 50, COST)!.current, 0);
  for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) assert.equal(manaMeter(10, bad, COST), null, `máximo ${bad}: sem barra`);
  assert.equal(manaMeter(10, 50, Number.NaN)!.low, false, "custo inválido não acende o aviso");
  assert.deepEqual(manaMeter(7, 60.9, COST), { current: 7, max: 60, percent: 12, low: false }, "máximo fracionário vira inteiro");
  assert.equal(manaMeter(5.7, 50, 5.5)!.low, false, "o aviso compara a mana exata com o custo: 5,7 paga uma magia de 5,5 (o número mostrado é 5)");
  assert.equal(manaMeter(5.4, 50, 5.5)!.low, true);
  assert.equal(manaMeter(1, 3, 5)!.percent, 33);
  assert.equal(manaMeter(2, 3, 5)!.percent, 67, "a porcentagem arredonda ao mais próximo");
});

test("quem usa mana tem barra e o Cavaleiro não: a leitura nasce da simulação de verdade", () => {
  const knight = new OfflineSimulation(SEED);
  assert.equal(manaMeter(knight.mana, knight.maxMana, COST), null, "o Cavaleiro tem máximo 0: sem barra");
  const mage = new OfflineSimulation(SEED, undefined, "mage");
  assert.deepEqual(manaMeter(mage.mana, mage.maxMana, COST), { current: 50, max: 50, percent: 100, low: false });
  assert.equal(mage.spendMana(COST), true);
  assert.deepEqual(manaMeter(mage.mana, mage.maxMana, COST), { current: 45, max: 50, percent: 90, low: false }, "a magia gasta 5");
  for (let i = 0; i < 9; i++) mage.spendMana(COST);
  assert.deepEqual(manaMeter(mage.mana, mage.maxMana, COST), { current: 0, max: 50, percent: 0, low: true }, "sem mana: aviso");
  for (let i = 0; i < 21; i++) mage.advanceClock(0.1); // 2,1 s a 2,5 por segundo: passa dos 5
  assert.equal(MAGE.manaPerSecond(1), 2.5);
  assert.equal(manaMeter(mage.mana, mage.maxMana, COST)!.low, false, "com o tempo a barra volta e o aviso some");
  const veteran = new OfflineSimulation(SEED, { ...new OfflineSimulation(SEED, undefined, "mage").snapshot(), experience: 1_000_000 });
  assert.ok(manaMeter(veteran.mana, veteran.maxMana, COST)!.max > 50, "o máximo da barra sobe com o nível");
});

test("o HUD só se redesenha quando o que se vê muda", () => {
  const a = manaMeter(32.1, 50, COST), b = manaMeter(32.8, 50, COST);
  assert.equal(sameManaMeter(a, b), true, "a mana anda por frações a cada quadro: o número inteiro igual não redesenha");
  assert.equal(sameManaMeter(a, manaMeter(33, 50, COST)), false, "outro número");
  assert.equal(sameManaMeter(a, manaMeter(32, 60, COST)), false, "outro máximo");
  assert.equal(sameManaMeter(manaMeter(4, 50, COST), manaMeter(4.5, 50, COST)), true);
  assert.equal(sameManaMeter(manaMeter(4.9, 50, COST), manaMeter(5, 50, COST)), false, "o aviso mudou");
  assert.equal(sameManaMeter(manaMeter(32, 50, COST), { ...manaMeter(32, 50, COST)!, percent: 99 }), false, "outra porcentagem");
  assert.equal(sameManaMeter(manaMeter(500, 1000, COST), manaMeter(501, 1000, COST)), false, "só o número mudou (a porcentagem arredonda igual)");
  assert.equal(sameManaMeter(manaMeter(0, 100, 0), manaMeter(0, 200, 0)), false, "só o máximo mudou");
  assert.equal(sameManaMeter(manaMeter(4, 50, 5), manaMeter(4, 50, 3)), false, "só o aviso mudou");
  assert.equal(sameManaMeter(null, null), true); assert.equal(sameManaMeter(a, null), false); assert.equal(sameManaMeter(null, a), false);
});

test("a ligação: o jogo manda a barra ao HUD, o HUD guarda e a tela desenha, com aviso e texto de apoio", () => {
  const game = read("src/game/Game.ts"), service = read("src/app/hud.service.ts"), ui = read("src/ui/GameUi.ts"), page = read("src/app/game-page.html"), core = read("src/app/styles/game-core.css");
  assert.match(game, /mana: this\.sim\.usesMana \? manaMeter\(this\.sim\.mana, this\.sim\.maxMana, STAVES\[this\.sim\.equippedStaff\]\.manaCost\) : null,/, "o jogo manda a barra só de quem usa mana, com o custo do cajado em mãos");
  assert.match(ui, /readonly mana: ManaMeter \| null;/);
  assert.match(service, /readonly mana = signal<ManaMeter \| null>\(null, \{ equal: sameManaMeter \}\);/, "o HUD guarda a barra e só muda quando o que se vê muda");
  assert.match(service, /this\.hp\.set\(hero\.hp\); this\.maxHp\.set\(hero\.maxHp\);\s*\n\s*this\.mana\.set\(hero\.mana\);/);
  assert.match(page, /@if \(hud\.mana\(\); as mana\) \{/, "a barra só existe para quem tem mana");
  assert.match(page, /<b id="manaText">\{\{ mana\.current \+ " \/ " \+ mana\.max \}\}<\/b>/);
  assert.match(page, /<div id="manaFill" \[style\.width\.%\]="mana\.percent"><\/div>/);
  assert.match(page, /role="img" \[class\.low\]="mana\.low"\s*\n\s*\[attr\.aria-label\]="'Barra de mana: ' \+ mana\.current \+ ' de ' \+ mana\.max \+ \(mana\.low \? ', sem mana para uma magia' : ''\)"/, "leitor de tela fala o número e o aviso");
  assert.match(page, /class="stat-heading mana-heading" \[class\.low\]="mana\.low"/);
  assert.match(core, /\.mana-meter\.low #manaFill \{\s*\n\s*background: linear-gradient\(90deg, #8a2f55, #d1648a\);/, "sem mana a barra fica vermelha");
  assert.match(core, /#manaFill \{\s*\n\s*height: 100%;\s*\n\s*width: 100%;\s*\n\s*background: linear-gradient\(90deg, #4a35b8, #9d86ff\);/, "e a cor normal é a da gema do cajado");
});
