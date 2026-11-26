import assert from "node:assert/strict";
import test from "node:test";
import { centralRosterProblem, runCaveQa, sampleCaves } from "../src/qa/QaCaves.ts";
import { CaveRoom } from "../src/engine/rooms/CaveRoom.ts";
import { caveReach } from "../src/world/caveReach.ts";
import { TILE_SIZE } from "../src/world/terrain.ts";

/**
 * O bot de QA de cavernas: para as cavernas de cada tema, em todos os andares, confere que nascem povoadas, que o herói alcança as criaturas e as escadas a pé e
 * que derrubar uma criatura deixa o saque no chão e o herói o recolhe. Já achou dois defeitos reais: as cavernas do Centro vazias (a varredura curta nunca as
 * via) e um monstro numa ilha isolada de uma caverna do Pântano.
 */
const SEED = 842136;

test("o bot de cavernas passa nos seis temas, em todos os andares", () => {
  const report = runCaveQa(SEED);
  assert.equal(report.status, "passed", JSON.stringify(report.findings.filter(item => item.status === "failed")));
  assert.deepEqual([...report.themes], ["basalt", "coastal", "desert", "glacial", "marsh", "verdant"]);
  assert.ok(report.caves >= 20 && report.floors >= report.caves && report.monsters > 100, `caves ${report.caves}, andares ${report.floors}, criaturas ${report.monsters}`);
  assert.equal(report.totals.failed, 0); assert.equal(report.totals.passed, report.findings.length);
  for (const id of ["populated", "monsters-reachable", "exit-reachable", "loot-cycle"]) assert.ok(report.findings.some(item => item.id === id && item.status === "passed"), id);
  assert.ok(report.findings.some(item => item.id === "stairs-reachable"), "as masmorras de vários andares têm a escada conferida");
  assert.equal(report.findings.filter(item => item.id === "populated").length, report.floors, "cada andar é conferido");
  // a mistura do Centro é conferida em cada caverna do tema (quatro), e só nelas: ao menos um slime e quatro tipos, todos do povo do Centro
  const roster = report.findings.filter(item => item.id === "roster");
  assert.equal(roster.length, 4); assert.ok(roster.every(item => item.status === "passed" && item.cave.includes("(verdant)") && /^[4-8] tipos: .*slime/.test(item.detail)), JSON.stringify(roster));
});

test("cada tema tem cavernas para conferir (antes só o Centro aparecia na varredura)", () => {
  const samples = sampleCaves(SEED);
  assert.deepEqual([...samples.keys()].sort(), ["basalt", "coastal", "desert", "glacial", "marsh", "verdant"]);
  for (const [theme, list] of samples) { assert.equal(list.length, 4, theme); assert.equal(new Set(list.map(item => item.id)).size, 4, theme); }
});

test("relatório reproduzível e seeds inválidas rejeitadas", () => {
  assert.deepEqual(runCaveQa(SEED), runCaveQa(SEED));
  for (const seed of [-1, Number.NaN, Number.POSITIVE_INFINITY, 4294967296]) assert.throws(() => runCaveQa(seed), RangeError);
});

test("regressão: na caverna do Pântano que tinha um monstro numa ilha isolada, nenhuma criatura nasce fora do alcance do herói", () => {
  const entrance = sampleCaves(SEED).get("marsh")!.find(item => item.id === `cave:${SEED}:49:49`);
  assert.ok(entrance, "a caverna do defeito está entre as amostras");
  const room = new CaveRoom(entrance, 100, 100, new Set()), reaches = caveReach(room.collision, room.player);
  assert.ok(room.monsters.size > 0);
  for (const mob of room.monsters.values()) assert.equal(reaches(mob.x, mob.y), true, mob.id + " alcançável");
  assert.equal(room.monsters.has(`${entrance.id}:floor:1:mob:4`), false, "o ponto da ilha não é mais usado");
});

test("caveReach: o chão ligado ao herói é alcançável; ilha isolada, parede e fora do mapa não", () => {
  // câmara de 4×4 tiles (5 a 8) com uma ilha de 1 tile no (20, 20) e nada mais
  const floorAt = (tx: number, ty: number): boolean => (tx >= 5 && tx <= 8 && ty >= 5 && ty <= 8) || (tx === 20 && ty === 20);
  const collision = { canMove: (x: number, y: number) => floorAt(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE)) };
  const reaches = caveReach(collision, { x: 6.5 * TILE_SIZE, y: 6.5 * TILE_SIZE });
  assert.equal(reaches(5.5 * TILE_SIZE, 5.5 * TILE_SIZE), true); assert.equal(reaches(8.5 * TILE_SIZE, 8.5 * TILE_SIZE), true);
  assert.equal(reaches(20.5 * TILE_SIZE, 20.5 * TILE_SIZE), false, "a ilha isolada"); assert.equal(reaches(9.5 * TILE_SIZE, 6.5 * TILE_SIZE), false, "parede");
  assert.equal(reaches(-10, -10), false); assert.equal(reaches(1e6, 1e6), false);
  // um corredor liga a ilha: aí ela passa a contar
  const linked = caveReach({ canMove: (x: number, y: number) => { const tx = Math.floor(x / TILE_SIZE), ty = Math.floor(y / TILE_SIZE); return floorAt(tx, ty) || (ty === 8 && tx > 8 && tx <= 20) || (tx === 20 && ty >= 8 && ty <= 20); } }, { x: 6.5 * TILE_SIZE, y: 6.5 * TILE_SIZE });
  assert.equal(linked(20.5 * TILE_SIZE, 20.5 * TILE_SIZE), true);
  // a busca respeita o tamanho do andar, mesmo se a colisão deixasse pisar além dele
  const open = caveReach({ canMove: () => true }, { x: 6.5 * TILE_SIZE, y: 6.5 * TILE_SIZE });
  assert.equal(open(41.5 * TILE_SIZE, 29.5 * TILE_SIZE), true, "o canto do andar"); assert.equal(open(42.5 * TILE_SIZE, 6.5 * TILE_SIZE), false, "além da largura"); assert.equal(open(6.5 * TILE_SIZE, 30.5 * TILE_SIZE), false, "além da altura");
});

test("a conferência da mistura do Centro reprova o que está errado e aprova o que está certo", () => {
  const ok = ["slime", "giant-rat", "cave-bat", "root-spider"];
  assert.equal(centralRosterProblem(new Set(ok)), null);
  assert.equal(centralRosterProblem(new Set([...ok, "moss-slime", "vine-snake", "root-beetle"])), null);
  assert.equal(centralRosterProblem(new Set(["giant-rat", "cave-bat", "root-spider", "moss-slime"])), "sem slime");
  assert.equal(centralRosterProblem(new Set(["slime", "giant-rat", "cave-bat"])), "só 3 tipos");
  assert.equal(centralRosterProblem(new Set()), "sem slime");
  assert.equal(centralRosterProblem(new Set([...ok, "dune-rat", "basalt-golem"])), "não é do Centro: basalt-golem, dune-rat");
});
