import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { approachSlime, caveHost, runCave } from "./helpers/caveModeHost.ts";

/**
 * Relato do dono: na caverna perto da cidade o Mago escolhia o slime, parava ao alcance, e a magia nunca ferrava ninguém. Causa: a caverna só
 * entregava o alvo do golpe (`strikeTargetId`) no quadro em que o golpe era PEDIDO, e a magia só sai depois do preparo (0,1 a 0,2 s), em outro quadro,
 * já sem alvo (a superfície entrega o alvo em todos os quadros). Estes testes rodam o `tickCave` de verdade, com a mesma ligação do jogo; os testes
 * antigos chamavam `CaveRoom.update` com o alvo em todos os quadros e escondiam o defeito.
 */
test("o Mago na caverna: escolhe o slime, para ao alcance e a magia FERE o slime (antes passava pelo preparo sem alvo e não ferrava ninguém)", () => {
  const h = caveHost("mage"), id = approachSlime(h, 170), mob = h.cave.monsters.get(id)!, before = mob.hp, mana0 = h.sim.mana;
  runCave(h, 1.5);
  assert.ok(mob.hp < before || !h.cave.monsters.has(id), "o slime levou dano da magia"); assert.ok(h.sim.mana < mana0 + 2.5 * 1.5, "e a magia gastou mana");
});

test("o Mago na caverna derruba o slime escolhido, magia após magia, sem o jogador fazer mais nada", () => {
  const h = caveHost("mage"), id = approachSlime(h, 170); runCave(h, 12);
  assert.equal(h.cave.monsters.has(id), false, "o slime caiu");
});

test("o Cavaleiro na caverna continua ferindo o slime escolhido (o conserto não mexe na espada)", () => {
  const h = caveHost("knight"), id = approachSlime(h, 20), mob = h.cave.monsters.get(id)!, before = mob.hp; runCave(h, 3);
  assert.ok(mob.hp < before || !h.cave.monsters.has(id), "o slime levou golpe de espada");
});

test("a ligação da caverna entrega ao golpe o alvo escolhido em todos os quadros, como a superfície (e não só no quadro em que o golpe é pedido)", () => {
  const cave = readFileSync("src/game/modes/caveMode.ts", "utf8"), surface = readFileSync("src/game/modes/surfaceMode.ts", "utf8");
  assert.match(surface, /classicStrike, host\.travel\.combat\.strikeTargetId,/, "a superfície entrega o alvo do golpe em todos os quadros");
  assert.doesNotMatch(cave, /classicStrike \? host\.travel\.combat\.strikeTargetId : undefined/, "a caverna não entrega o alvo só no quadro do pedido");
});
