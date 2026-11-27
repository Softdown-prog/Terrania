import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { applyCaveVictories } from "../src/engine/rooms/CaveRewards.ts";
import { MAX_COINS } from "../src/engine/character/coins/index.ts";
import { Inventory } from "../src/engine/character/Inventory.ts";
import { ROOTS_BOSS_KIND, ROOTS_NPC, ROOTS_REWARD_COINS, RootsQuest, emptyRootsQuest, normalizeRootsQuest, rootsQuestStarted } from "../src/engine/quests/center/roots/index.ts";
import { rootsEntry } from "../src/engine/quests/journal/roots.ts";
import { ROOTS_LINES } from "../src/game/messages/center/roots/index.ts";
import { loadLocalSave } from "../src/storage/localSave.ts";
import { caveEntranceInCell, isStarterCave } from "../src/world/caves.ts";
import { nearestRootsDungeon } from "../src/world/nearestRootsDungeon.ts";

/** "A Raiz Velha" (ADR 0104): a segunda missão de Aela. Depois da clareira, vencer o Ent Ancião no fundo de uma Masmorra das Raízes e voltar a ela. */
const SEED = 842136;
const BOSS_ID = "cave:842136:4:3:floor:5:boss";
const ok = (inventory = new Inventory()): Inventory => inventory;
const victory = (kind: string, id: string) => ({ player: { hp: 100, maxHp: 100 }, drainVictories: () => [{ kind: kind as never, id }] });

test("Aela só conta da Raiz Velha a quem já recebeu a recompensa da clareira, e só ela conta", () => {
  const quest = new RootsQuest(), bag = ok();
  assert.deepEqual(quest.talk(ROOTS_NPC, bag, false), { event: null, changed: false });
  assert.equal(quest.view.accepted, false);
  assert.deepEqual(quest.talk("mira", bag, true), { event: null, changed: false });
  assert.deepEqual(quest.talk(ROOTS_NPC, bag, true), { event: "accepted", changed: true });
  assert.equal(quest.view.accepted, true);
});

test("aceita, Aela lembra o que falta enquanto o Ent Ancião não cai, sem mudar nada e sem pagar", () => {
  const quest = new RootsQuest(), bag = ok();
  quest.talk(ROOTS_NPC, bag, true);
  for (let i = 0; i < 3; i++) assert.deepEqual(quest.talk(ROOTS_NPC, bag, true), { event: "reminder", changed: false });
  assert.equal(bag.coins, 0);
});

test("o abate vale só do Ent Ancião, só do chefe do último andar e só depois de aceita; derrotas de antes da missão não contam", () => {
  const quest = new RootsQuest();
  assert.equal(quest.noteDefeat(ROOTS_BOSS_KIND, true), false, "antes de aceitar não conta");
  quest.talk(ROOTS_NPC, ok(), true);
  assert.equal(quest.noteDefeat(ROOTS_BOSS_KIND, false), false, "um Ent que não é o chefe do andar não conta");
  assert.equal(quest.noteDefeat("living-root", true), false, "outro bicho não conta");
  assert.equal(quest.noteDefeat(ROOTS_BOSS_KIND, true), true);
  assert.equal(quest.view.bossDown, true);
  assert.equal(quest.noteDefeat(ROOTS_BOSS_KIND, true), false, "só muda uma vez");
});

test("derrotado o Ent, falar com Aela paga as moedas uma única vez e fecha a missão", () => {
  const quest = new RootsQuest(), bag = ok();
  quest.talk(ROOTS_NPC, bag, true); quest.noteDefeat(ROOTS_BOSS_KIND, true);
  assert.deepEqual(quest.talk(ROOTS_NPC, bag, true), { event: "reported", changed: true });
  assert.equal(bag.coins, ROOTS_REWARD_COINS);
  assert.equal(quest.view.reported, true);
  assert.deepEqual(quest.talk(ROOTS_NPC, bag, true), { event: null, changed: false }, "paga uma vez só");
  assert.equal(bag.coins, ROOTS_REWARD_COINS);
});

test("carteira cheia: a missão não é marcada como paga e a recompensa espera", () => {
  const quest = new RootsQuest(), bag = ok();
  bag.addCoins(MAX_COINS - ROOTS_REWARD_COINS + 1);
  quest.talk(ROOTS_NPC, bag, true); quest.noteDefeat(ROOTS_BOSS_KIND, true);
  const before = bag.coins;
  assert.deepEqual(quest.talk(ROOTS_NPC, bag, true), { event: "report-wallet-full", changed: false });
  assert.equal(quest.view.reported, false); assert.equal(bag.coins, before);
  const roomy = ok(); quest.talk(ROOTS_NPC, roomy, true);
  assert.equal(quest.view.reported, true, "com espaço, paga");
});

test("o save nunca é confiado: cada etapa só vale se a anterior vale", () => {
  assert.deepEqual(normalizeRootsQuest(undefined), emptyRootsQuest());
  for (const junk of [null, 5, "x", [], [true]]) assert.deepEqual(normalizeRootsQuest(junk), emptyRootsQuest());
  assert.deepEqual(normalizeRootsQuest({ accepted: false, bossDown: true, reported: true }), emptyRootsQuest(), "sem aceitar, nada vale");
  assert.deepEqual(normalizeRootsQuest({ accepted: true, bossDown: false, reported: true }), { accepted: true, bossDown: false, reported: false }, "pago sem ter derrotado o Ent: não vale");
  assert.deepEqual(normalizeRootsQuest({ accepted: true, bossDown: true, reported: true }), { accepted: true, bossDown: true, reported: true });
  assert.deepEqual(normalizeRootsQuest({ accepted: 1, bossDown: "true" }), emptyRootsQuest(), "só `true` vale");
  assert.equal(rootsQuestStarted(emptyRootsQuest()), false); assert.equal(rootsQuestStarted({ accepted: true, bossDown: false, reported: false }), true);
});

test("pela simulação: o abate do chefe é guardado ao aplicar a vitória, entra no save e volta quando o jogo é recarregado", () => {
  const sim = new OfflineSimulation(SEED);
  sim.inventory.claimAelaReward(5);
  assert.equal("rootsQuest" in sim.snapshot(), false, "missão não começada não ocupa o save");
  applyCaveVictories(sim, victory(ROOTS_BOSS_KIND, BOSS_ID));
  assert.equal(sim.roots.view.bossDown, false, "antes de aceitar o abate não conta");
  sim.defeated.delete(BOSS_ID);
  sim.roots.talk(ROOTS_NPC, sim.inventory, sim.inventory.questRewardClaimed);
  assert.equal(applyCaveVictories(sim, victory("living-root", "cave:842136:4:3:floor:4:mob:1")), true);
  assert.equal(sim.roots.view.bossDown, false, "outra criatura não conta");
  applyCaveVictories(sim, victory(ROOTS_BOSS_KIND, BOSS_ID + "x"));
  assert.equal(sim.roots.view.bossDown, false, "o id precisa ser o do chefe (`:boss`)");
  applyCaveVictories(sim, victory(ROOTS_BOSS_KIND, BOSS_ID));
  assert.equal(sim.roots.view.bossDown, true);
  const saved = JSON.parse(JSON.stringify(sim.snapshot()));
  assert.deepEqual(saved.rootsQuest, { accepted: true, bossDown: true, reported: false });
  assert.deepEqual(new OfflineSimulation(SEED, saved).roots.view, { accepted: true, bossDown: true, reported: false });
  assert.deepEqual(new OfflineSimulation(SEED + 1, saved).roots.view, emptyRootsQuest(), "outro mundo não herda a missão");
});

test("o carregamento do navegador normaliza a missão do save (e descarta o que não faz sentido)", () => {
  const store = new Map<string, string>(), g = globalThis as unknown as { localStorage?: unknown }, previous = g.localStorage;
  g.localStorage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => void store.set(key, value) };
  try {
    const base = { seed: SEED, x: 0, y: 0, hp: 100, kills: 0, defeated: [] };
    store.set("terrania-origins-v1", JSON.stringify({ ...base, rootsQuest: { accepted: true, bossDown: true, reported: true, extra: 1 } }));
    assert.deepEqual(loadLocalSave()?.rootsQuest, { accepted: true, bossDown: true, reported: true });
    store.set("terrania-origins-v1", JSON.stringify({ ...base, rootsQuest: { accepted: false, bossDown: true } }));
    assert.equal(loadLocalSave() !== null && "rootsQuest" in loadLocalSave()!, false, "missão não aceita não vai para o estado");
  } finally { if (previous === undefined) delete g.localStorage; else g.localStorage = previous; }
});

test("diário: para começar (com o que falta), em andamento por etapas, e concluída; o guia só aparece na etapa atual", () => {
  const dungeon = { x: 100, y: 200 };
  const early = rootsEntry(emptyRootsQuest(), false), offer = rootsEntry(emptyRootsQuest(), true);
  assert.equal(early.status, "available"); assert.equal(offer.status, "available");
  assert.match(early.steps[0]!.text, /Termine antes a missão "Proteja a clareira"/); assert.equal(early.steps[0]!.place, undefined);
  assert.match(offer.steps[0]!.text, /Fale com Aela/); assert.equal(offer.steps[0]!.place?.label, "Aela, na clareira da vila");
  const hunt = rootsEntry({ accepted: true, bossDown: false, reported: false }, true, dungeon);
  assert.equal(hunt.status, "active"); assert.deepEqual(hunt.steps.map(step => step.state), ["done", "current", "todo"]);
  assert.deepEqual(hunt.steps[1]!.place, { x: 100, y: 200, label: "a Masmorra das Raízes mais perto" }); assert.equal(hunt.percent, 30);
  assert.equal(rootsEntry({ accepted: true, bossDown: false, reported: false }, true).steps[1]!.place, undefined, "sem saber a gruta, sem guia");
  const back = rootsEntry({ accepted: true, bossDown: true, reported: false }, true, dungeon);
  assert.deepEqual(back.steps.map(step => step.state), ["done", "done", "current"]); assert.equal(back.steps[2]!.place?.label, "Aela, na clareira da vila"); assert.equal(back.steps[1]!.place, undefined); assert.equal(back.percent, 80);
  const done = rootsEntry({ accepted: true, bossDown: true, reported: true }, true, dungeon);
  assert.equal(done.status, "completed"); assert.equal(done.percent, 100); assert.deepEqual(done.steps.map(step => step.state), ["done", "done", "done"]);
  assert.equal(done.reward, `${ROOTS_REWARD_COINS} Terrania Gold`);
});

test("a gruta mais perto: é verde, não é a de treinamento, e é a mais próxima das nove células em volta", () => {
  const near = nearestRootsDungeon(SEED, 60, 20);
  assert.ok(near && near.theme === "verdant" && !near.tower && !isStarterCave(near));
  for (const [x, y] of [[60, 20], [-300, 500], [1000, -800], [0, 0]] as const) {
    const found = nearestRootsDungeon(SEED, x, y);
    if (!found) continue;
    assert.ok(!isStarterCave(found) && found.theme === "verdant");
    for (let dx = -4; dx <= 4; dx++) for (let dy = -4; dy <= 4; dy++) {
      const other = caveEntranceInCell(Math.floor(x / 96) + dx, Math.floor(y / 96) + dy, SEED);
      if (!other || other.tower || other.theme !== "verdant" || isStarterCave(other)) continue;
      assert.ok(Math.hypot(found.tileX - x, found.tileY - y) <= Math.hypot(other.tileX - x, other.tileY - y) + 1e-9, "nenhuma outra é mais perto");
    }
  }
  for (const bad of [NaN, Infinity]) { assert.equal(nearestRootsDungeon(bad, 0, 0), null); assert.equal(nearestRootsDungeon(SEED, bad, 0), null); assert.equal(nearestRootsDungeon(SEED, 0, bad), null); }
});

test("falas: cada evento tem as suas, a de pagamento diz a quantia e o Diário; e o jogo liga tudo na conversa com Aela", () => {
  for (const event of ["accepted", "reminder", "reported", "report-wallet-full"] as const) assert.ok(ROOTS_LINES[event].length > 0 && ROOTS_LINES[event].every(line => line.length > 10), event);
  assert.ok(ROOTS_LINES.reported.some(line => line.includes(String(ROOTS_REWARD_COINS))));
  assert.ok(ROOTS_LINES.accepted.some(line => /Diário/.test(line)) && ROOTS_LINES.accepted.some(line => /Ent Ancião/.test(line)));
  const game = readFileSync("src/game/Game.ts", "utf8");
  assert.match(game, /this\.sim\.roots\.talk\(npc\.id, this\.sim\.inventory, this\.sim\.inventory\.questRewardClaimed && !rewarded\)/, "só depois da clareira, e não na mesma conversa em que a recompensa dela sai");
  assert.match(game, /roots\.event \? ROOTS_LINES\[roots\.event\]/);
  assert.match(game, /roots: this\.sim\.roots\.view/, "o diário recebe o estado da missão");
});
