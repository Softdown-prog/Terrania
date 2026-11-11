import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { Inventory } from "../src/engine/character/Inventory.ts";
import { MAX_COINS } from "../src/engine/character/coins/index.ts";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { WELL_ANALYST_NPC, WELL_REPORT_NPC, WELL_SIGN_NPC, WellInvestigation } from "../src/engine/quests/south/well/index.ts";
import { WELL_REWARD_COINS, WELL_SAMPLE_MATERIAL, WELL_WITNESSES, normalizeWellQuest, wellQuestStarted,
  wellQuestSummary } from "../src/engine/quests/south/well/index.ts";
import type { WellEvent } from "../src/engine/quests/south/well/index.ts";
import { WELL_LINES } from "../src/game/messages/south/well/index.ts";
import { NPCS } from "../src/world/npcs.ts";
import { CREATURE_CATALOG } from "../src/actors/CreatureCatalog.ts";

/**
 * Missão "A Água Escura" (ADR 0031): três versões, examinar o poço, comparação de Ixtal com a gosma
 * do brejo e a recompensa única de Gorrak. Cada etapa só vale depois da anterior.
 */
const bag = (extra: Record<string, unknown> = {}): Inventory => new Inventory({ gel: 0, potion: 0, questRewardClaimed: false, ...extra });
const hearAll = (quest: WellInvestigation, inventory: Inventory): void => { for (const id of WELL_WITNESSES) quest.talk(id, inventory); };

test("os atores da missão existem e a gosma é saque real da hidra do brejo", () => {
  for (const id of [...WELL_WITNESSES, WELL_SIGN_NPC, WELL_ANALYST_NPC, WELL_REPORT_NPC]) assert.ok(NPCS.some(n => n.id === id), id);
  assert.equal(WELL_REPORT_NPC, "south-gorrak");
  assert.ok(Object.values(CREATURE_CATALOG).some(c => c.loot.some(l => l.item === WELL_SAMPLE_MATERIAL)));
  const files = readdirSync(new URL("../src/engine/quests/south/well/", import.meta.url)).map(f => f.replace(/\.ts$/, "")).sort();
  assert.deepEqual(files, ["WellInvestigation", "constants", "events", "index", "normalize", "questState", "summary", "witness"],
    "cada assunto no seu arquivo");
  const lines = readdirSync(new URL("../src/game/messages/south/well/", import.meta.url)).map(f => f.replace(/\.ts$/, "")).sort();
  assert.equal(lines.length, Object.keys(WELL_LINES).length + 1, "uma fala por evento, cada uma no seu arquivo, mais o índice");
});

test("as três versões valem em qualquer ordem e só uma vez cada", () => {
  const q = new WellInvestigation(), inv = bag();
  assert.deepEqual(q.talk("south-sylrael", inv), { event: "heard:south-sylrael", changed: true });
  assert.deepEqual(q.talk("south-sylrael", inv), { event: null, changed: false }, "a mesma versão não conta de novo");
  assert.deepEqual(q.talk("south-gorrak", inv), { event: "heard:south-gorrak", changed: true });
  assert.deepEqual(q.talk("south-khemet", inv), { event: "heard:south-khemet", changed: true });
  assert.deepEqual(q.view.heard, WELL_WITNESSES, "guardadas em ordem fixa");
  assert.deepEqual(q.talk("south-madame", inv), { event: null, changed: false }, "outro NPC não mexe na missão");
});

test("o poço só se examina com as três versões, e a análise exige a etapa anterior", () => {
  const q = new WellInvestigation(), inv = bag({ materials: { [WELL_SAMPLE_MATERIAL]: 2 } });
  assert.equal(q.talk(WELL_SIGN_NPC, inv).event, "sign-needs-witnesses");
  assert.equal(q.view.inspected, false);
  assert.deepEqual(q.talk(WELL_ANALYST_NPC, inv), { event: null, changed: false }, "Ixtal ainda não sabe de nada");
  assert.equal(inv.materials[WELL_SAMPLE_MATERIAL], 2, "a gosma não foi gasta fora de hora");
  q.talk("south-gorrak", inv); q.talk("south-khemet", inv);
  assert.equal(q.talk(WELL_SIGN_NPC, inv).event, "sign-needs-witnesses", "faltam versões");
  q.talk("south-sylrael", inv);
  assert.deepEqual(q.talk(WELL_SIGN_NPC, inv), { event: "well-inspected", changed: true });
  assert.deepEqual(q.talk(WELL_SIGN_NPC, inv), { event: null, changed: false }, "examinar de novo não repete");
  assert.deepEqual(q.talk(WELL_REPORT_NPC, inv), { event: null, changed: false }, "Gorrak não paga antes da análise");
});

test("Ixtal gasta uma gosma e só ela; sem gosma nada muda", () => {
  const q = new WellInvestigation(), none = bag();
  hearAll(q, none); q.talk(WELL_SIGN_NPC, none);
  assert.deepEqual(q.talk(WELL_ANALYST_NPC, none), { event: "analysis-needs-sample", changed: false });
  assert.equal(q.view.analyzed, false);
  const inv = bag({ materials: { [WELL_SAMPLE_MATERIAL]: 2, "Rabo de Rato": 3 } });
  assert.deepEqual(q.talk(WELL_ANALYST_NPC, inv), { event: "analyzed", changed: true });
  assert.deepEqual(inv.materials, { [WELL_SAMPLE_MATERIAL]: 1, "Rabo de Rato": 3 });
  assert.deepEqual(q.talk(WELL_ANALYST_NPC, inv), { event: null, changed: false }, "não analisa duas vezes nem gasta mais gosma");
  assert.equal(inv.materials[WELL_SAMPLE_MATERIAL], 1);
});

test("Gorrak paga 150 Terrania Gold uma única vez; carteira cheia não marca como paga", () => {
  const q = new WellInvestigation(), inv = bag({ coins: 10, materials: { [WELL_SAMPLE_MATERIAL]: 1 } });
  hearAll(q, inv); q.talk(WELL_SIGN_NPC, inv); q.talk(WELL_ANALYST_NPC, inv);
  assert.deepEqual(q.talk(WELL_REPORT_NPC, inv), { event: "reported", changed: true });
  assert.equal(inv.coins, 10 + WELL_REWARD_COINS);
  assert.equal(q.view.reported, true);
  assert.deepEqual(q.talk(WELL_REPORT_NPC, inv), { event: null, changed: false });
  assert.equal(inv.coins, 10 + WELL_REWARD_COINS, "nunca paga duas vezes");

  const full = new WellInvestigation(), rich = bag({ coins: MAX_COINS - WELL_REWARD_COINS + 1, materials: { [WELL_SAMPLE_MATERIAL]: 1 } });
  hearAll(full, rich); full.talk(WELL_SIGN_NPC, rich); full.talk(WELL_ANALYST_NPC, rich);
  assert.deepEqual(full.talk(WELL_REPORT_NPC, rich), { event: "report-wallet-full", changed: false });
  assert.equal(rich.coins, MAX_COINS - WELL_REWARD_COINS + 1, "nada foi pago");
  assert.equal(full.view.reported, false, "a missão continua aberta");
  rich.spendCoins(10);
  assert.equal(full.talk(WELL_REPORT_NPC, rich).event, "reported", "com espaço, paga");
});

test("o save mantém o progresso e nunca aceita etapa sem a anterior", () => {
  const sim = new OfflineSimulation(842136);
  assert.equal("wellQuest" in sim.snapshot(), false, "missão não começada não ocupa o save");
  sim.inventory.addMaterial(WELL_SAMPLE_MATERIAL);
  hearAll(sim.well, sim.inventory); sim.well.talk(WELL_SIGN_NPC, sim.inventory);
  const saved = JSON.parse(JSON.stringify(sim.snapshot()));
  assert.deepEqual(new OfflineSimulation(842136, saved).well.view, sim.well.view);
  assert.equal(new OfflineSimulation(1, saved).well.view.heard.length, 0, "outro mundo recomeça");

  assert.deepEqual(normalizeWellQuest({ heard: ["south-gorrak"], inspected: true, analyzed: true, reported: true }),
    { heard: ["south-gorrak"], inspected: false, analyzed: false, reported: false }, "sem as 3 versões não se inspeciona");
  assert.deepEqual(normalizeWellQuest({ heard: [...WELL_WITNESSES], inspected: false, analyzed: true, reported: true }),
    { heard: WELL_WITNESSES, inspected: false, analyzed: false, reported: false }, "análise exige inspeção");
  assert.equal(normalizeWellQuest({ heard: [...WELL_WITNESSES], inspected: true, analyzed: false, reported: true }).reported, false);
  for (const bad of [null, undefined, 3, "x", [], { heard: "south-gorrak" }, { heard: ["fake", 7, null] }, { inspected: "true" }])
    assert.deepEqual(normalizeWellQuest(bad), { heard: [], inspected: false, analyzed: false, reported: false }, JSON.stringify(bad));
  assert.equal(wellQuestStarted(normalizeWellQuest({})), false);
});

test("o painel de missão mostra cada etapa e termina em 100%", () => {
  const q = new WellInvestigation(), inv = bag({ materials: { [WELL_SAMPLE_MATERIAL]: 1 } });
  assert.equal(wellQuestSummary(q.view).started, false);
  q.talk("south-gorrak", inv);
  assert.deepEqual([wellQuestSummary(q.view).started, wellQuestSummary(q.view).progress], [true, "Ouça as 3 versões: 1 / 3"]);
  const steps = [wellQuestSummary(q.view).percent];
  q.talk("south-khemet", inv); q.talk("south-sylrael", inv); steps.push(wellQuestSummary(q.view).percent);
  assert.match(wellQuestSummary(q.view).progress, /Examine o poço/);
  q.talk(WELL_SIGN_NPC, inv); steps.push(wellQuestSummary(q.view).percent);
  assert.match(wellQuestSummary(q.view).progress, /Gosma Tóxica/);
  q.talk(WELL_ANALYST_NPC, inv); steps.push(wellQuestSummary(q.view).percent);
  assert.match(wellQuestSummary(q.view).progress, /Gorrak/);
  q.talk(WELL_REPORT_NPC, inv); steps.push(wellQuestSummary(q.view).percent);
  assert.deepEqual(steps, [17, 50, 65, 90, 100]);
  assert.deepEqual([wellQuestSummary(q.view).done, wellQuestSummary(q.view).progress], [true, "Missão concluída ✓"]);
});

test("todo evento da missão tem falas, e a recompensa aparece no texto", () => {
  const events: WellEvent[] = [...WELL_WITNESSES.map(id => `heard:${id}` as const), "sign-needs-witnesses", "well-inspected",
    "analysis-needs-sample", "analyzed", "reported", "report-wallet-full"];
  assert.deepEqual(Object.keys(WELL_LINES).sort(), [...events].sort());
  for (const event of events) assert.ok(WELL_LINES[event].length >= 1 && WELL_LINES[event].every(l => l.length > 10), event);
  assert.ok(WELL_LINES.reported.join(" ").includes("1 Cripta Coin e 50 Terrania Gold"));
});

test("Inventory.spendMaterial é atômico e recusa quantidade inválida", () => {
  const inv = bag({ materials: { [WELL_SAMPLE_MATERIAL]: 2 } });
  assert.equal(inv.spendMaterial(WELL_SAMPLE_MATERIAL, 3), false);
  assert.equal(inv.materials[WELL_SAMPLE_MATERIAL], 2);
  for (const bad of [0, -1, 1.5, Number.NaN]) assert.equal(inv.spendMaterial(WELL_SAMPLE_MATERIAL, bad), false, String(bad));
  assert.equal(inv.spendMaterial("Item inventado", 1), false);
  assert.equal(inv.spendMaterial(WELL_SAMPLE_MATERIAL, 2), true);
  assert.equal(WELL_SAMPLE_MATERIAL in inv.materials, false, "acabou: some da bolsa");
});
