import test from "node:test";
import assert from "node:assert/strict";
import { RegionalMonster } from "../src/actors/RegionalMonster.ts";
import { CaveRoom, RESPAWN_MIN_DISTANCE } from "../src/engine/rooms/CaveRoom.ts";
import { respawnSecondsForId } from "../src/engine/combat/respawn.ts";
import { caveEntranceInCell, type CaveEntrance } from "../src/world/caves.ts";
import { CAVE_SEED, FRAME, caveHost, runCave, type CaveHost } from "./helpers/caveModeHost.ts";
import { tickCave } from "../src/game/modes/caveMode.ts";

/**
 * Relato do dono: conferir se os respawns funcionam nas cavernas. Dentro do andar quem caía só voltava ao sair e entrar de novo; agora, passado o prazo (ADR 0029),
 * a criatura reaparece onde nasceu, com a vida cheia, desde que o herói esteja longe do lugar. Estes testes rodam o `tickCave` de verdade.
 */
const desert = (): CaveEntrance => { for (let cx = -12; cx <= 12; cx++) { const found = caveEntranceInCell(cx, 125, CAVE_SEED); if (found?.theme === "desert") return found; } throw new Error("sem caverna do deserto"); };
const mobIds = (h: CaveHost): string[] => [...h.cave.monsters.keys()];
/** Põe o herói longe de todo mundo e derruba o monstro `id` pelo caminho real (vida zero, um quadro). */
function kill(h: CaveHost, id: string): void {
  const mob = h.cave.monsters.get(id)!; mob.hp = 0; tickCave(h.host, h.cave, FRAME);
  assert.equal(h.cave.monsters.has(id), false, "caiu"); assert.equal(h.sim.defeated.has(id), true, "e ficou anotado como derrotado");
}
function farFrom(h: CaveHost, x: number, y: number): void {
  const player = h.cave.player;
  for (let ty = 3; ty < 60; ty++) for (let tx = 3; tx < 60; tx++) {
    const px = (tx + .5) * 32, py = (ty + .5) * 32;
    if (h.cave.collision.canMove(px, py) && Math.hypot(px - x, py - y) > RESPAWN_MIN_DISTANCE + 60) { player.x = px; player.y = py; return; }
  }
  assert.fail("não achei lugar longe");
}
const wait = (h: CaveHost, seconds: number): void => { for (let i = 0; i < Math.round(seconds * 10); i++) h.sim.advanceClock(.1); };
const withSeconds = (h: CaveHost): { id: string; spot: { x: number; y: number }; seconds: number } => {
  const id = mobIds(h).find(candidate => respawnSecondsForId(candidate, (h.cave.monsters.get(candidate) as RegionalMonster).kind) !== null)!;
  const mob = h.cave.monsters.get(id)!;
  return { id, spot: { x: mob.x, y: mob.y }, seconds: respawnSecondsForId(id, mob.kind)! };
};

test("dentro do andar, quem caiu volta no lugar onde nasceu, com a vida cheia, passado o prazo", () => {
  const h = caveHost("knight", desert()), { id, spot, seconds } = withSeconds(h), full = h.cave.monsters.get(id)!.hp;
  farFrom(h, spot.x, spot.y); kill(h, id);
  runCave(h, 2);
  assert.equal(h.cave.monsters.has(id), false, "logo depois ainda não voltou");
  wait(h, seconds - 5); runCave(h, 2);
  assert.equal(h.cave.monsters.has(id), false, "antes do prazo não volta");
  wait(h, 10);
  for (let i = 0; i < 90 && !h.cave.monsters.has(id); i++) tickCave(h.host, h.cave, FRAME); // no quadro em que reaparece, ainda parado no ponto de origem
  const back = h.cave.monsters.get(id)!;
  assert.ok(back, "passado o prazo, voltou"); assert.equal(back.hp, full, "com a vida cheia"); assert.deepEqual({ x: back.x, y: back.y }, spot, "no lugar onde nasceu");
  assert.equal(h.sim.defeated.has(id), false, "e deixou de constar como derrotado");
  assert.equal(h.cave.monsters.size, mobIds(h).length, "uma criatura por id");
});

test("a criatura não surge em cima do herói: espera ele sair de perto e então volta", () => {
  const h = caveHost("knight", desert()), { id, spot, seconds } = withSeconds(h);
  farFrom(h, spot.x, spot.y); kill(h, id); wait(h, seconds + 5);
  h.cave.player.x = spot.x; h.cave.player.y = spot.y; runCave(h, 2);
  assert.equal(h.cave.monsters.has(id), false, "com o herói no lugar, não volta");
  assert.equal(RESPAWN_MIN_DISTANCE, 170);
  h.cave.player.x = spot.x + 169; h.cave.player.y = spot.y; runCave(h, 2);
  assert.equal(h.cave.monsters.has(id), false, "a 169 px, um passo antes da distância, ainda não");
  farFrom(h, spot.x, spot.y); runCave(h, 2);
  assert.equal(h.cave.monsters.has(id), true, "com o herói longe, volta");
});

test("quem está vivo não é refeito: segue com a vida e o lugar que tem", () => {
  const h = caveHost("knight", desert()), id = mobIds(h)[0]!, mob = h.cave.monsters.get(id)!;
  farFrom(h, mob.x, mob.y); mob.hp = 7; const at = { x: mob.x, y: mob.y };
  h.cave.respawnTick(1.5, () => undefined);
  assert.equal(h.cave.monsters.get(id), mob, "é a mesma criatura"); assert.equal(mob.hp, 7); assert.deepEqual({ x: mob.x, y: mob.y }, at);
});

test("o slime também volta como slime, no lugar onde nasceu (o ramo do Slime comum; os de treino da Aela só nunca voltam por regra do prazo)", () => {
  const room = new CaveRoom(caveEntranceInCell(0, 0, CAVE_SEED)!, 100, 100, new Set());
  const id = [...room.monsters.keys()][0]!, original = room.monsters.get(id)!, spot = { x: original.x, y: original.y };
  room.player.x = 700; room.player.y = 700; // longe do ponto
  room.monsters.delete(id); // simula quem acabou de voltar a poder nascer (fora dos derrotados)
  assert.deepEqual(room.respawnTick(2, () => undefined), [id]);
  const back = room.monsters.get(id)!;
  assert.ok(back && !(back instanceof RegionalMonster), "voltou como slime"); assert.deepEqual({ x: back.x, y: back.y }, spot); assert.equal(back.hp, original.hp, "nasce com a vida de um slime novo");
});

test("o que a criatura deixou no chão some quando ela volta", () => {
  const h = caveHost("knight", desert()), { id, spot, seconds } = withSeconds(h);
  farFrom(h, spot.x, spot.y); kill(h, id);
  assert.ok(h.cave.drops.has(id + ":coin"), "a moeda ficou no chão");
  wait(h, seconds + 5); runCave(h, 2);
  assert.equal(h.cave.monsters.has(id), true);
  assert.equal(h.cave.drops.has(id + ":coin"), false, "voltou sem a moeda do chão");
});

test("quem já estava caído quando se entrou no andar também volta, passado o prazo", () => {
  const seed = caveHost("knight", desert()), { id, spot, seconds } = withSeconds(seed), kind = (seed.cave.monsters.get(id) as RegionalMonster).kind;
  const h = caveHost("knight", desert()); h.sim.defeated.add(id); h.sim.noteDefeat(id, kind); // o save já o tinha como derrotado
  const cave = new CaveRoom(desert(), 100, 100, h.sim.defeated); Object.assign(h, { cave });
  assert.equal(cave.monsters.has(id), false, "entrou sem ele");
  farFrom(h, spot.x, spot.y); wait(h, seconds + 5);
  for (let i = 0; i < 90 && !cave.monsters.has(id); i++) tickCave(h.host, cave, FRAME);
  assert.deepEqual({ x: cave.monsters.get(id)?.x, y: cave.monsters.get(id)?.y }, spot, "voltou no lugar onde nasceu");
});

test("a caverna de treinamento da Aela nunca devolve os slimes (a missão depende dos abates)", () => {
  const h = caveHost("knight"), id = mobIds(h)[0]!;
  assert.equal(respawnSecondsForId(id, "slime"), null);
  farFrom(h, h.cave.monsters.get(id)!.x, h.cave.monsters.get(id)!.y); kill(h, id);
  wait(h, 5_000); runCave(h, 3);
  assert.equal(h.cave.monsters.has(id), false, "continua derrotado"); assert.equal(h.sim.defeated.has(id), true);
});

test("o chefe do último andar volta em 30 minutos, não antes", () => {
  const entrance = desert(), h = caveHost("knight", entrance);
  const last = (() => { let room = h.cave; while (room.floorIndex < room.floorCount) room = new CaveRoom(entrance, 100, 100, h.sim.defeated, { floorIndex: room.floorIndex + 1 }); return room; })();
  Object.assign(h, { cave: last });
  const bossId = [...last.monsters.keys()].find(key => key.endsWith(":boss"))!, boss = last.monsters.get(bossId)!;
  farFrom(h, boss.x, boss.y); kill(h, bossId);
  wait(h, 1_700); runCave(h, 2); assert.equal(last.monsters.has(bossId), false, "aos 28 minutos ainda não");
  wait(h, 150); runCave(h, 2); assert.equal(last.monsters.has(bossId), true, "aos 30 minutos voltou");
});

test("a conferência é de segundo em segundo, e dt inválido não mexe em nada", () => {
  const h = caveHost("knight", desert()); let releases = 0;
  for (let i = 0; i < 59; i++) h.cave.respawnTick(1 / 60, () => { releases++; });
  assert.equal(releases, 0, "menos de um segundo, nada");
  h.cave.respawnTick(1 / 60, () => { releases++; }); assert.equal(releases, 1, "no primeiro segundo confere uma vez");
  for (let i = 0; i < 59; i++) h.cave.respawnTick(1 / 60, () => { releases++; });
  assert.equal(releases, 1, "o relógio recomeça: só no segundo seguinte confere de novo");
  h.cave.respawnTick(1 / 60, () => { releases++; }); assert.equal(releases, 2);
  releases = 1;
  for (const bad of [0, -1, NaN, Infinity * 0]) assert.deepEqual(h.cave.respawnTick(bad, () => { releases++; }), []);
  assert.equal(releases, 1);
});
