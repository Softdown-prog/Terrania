import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MountStable, WILD_HOOFPRINTS, WILD_WARHORSE, STABLE_MASTER } from "../src/engine/mounts/MountStable.ts";
import { experienceForLevel } from "../src/engine/character/Experience.ts";
import { emptyWellQuest, wellQuestSummary, type WellQuestState } from "../src/engine/quests/south/well/index.ts";
import { emptyRootsQuest } from "../src/engine/quests/center/roots/index.ts";
import { rootsEntry } from "../src/engine/quests/journal/roots.ts";
import { MOUNT_QUESTS } from "../src/world/mountQuests.ts";
import { buildJournal, currentStep, GUIDE_HERE_TILES, questGuide, questPanel, trackedEntry, type JournalEntry, type JournalSources } from "../src/engine/quests/journal/index.ts";
import { clearingEntry } from "../src/engine/quests/journal/clearing.ts";
import { warhorseEntry } from "../src/engine/quests/journal/warhorse.ts";
import { wellEntry } from "../src/engine/quests/journal/well.ts";

/** O diário de missões (ADR 0100): o estado de cada missão em etapas legíveis, o guia de direção, e o painel da tela que só acompanha missão em andamento. */
const states = (entry: JournalEntry) => entry.steps.map(step => step.state[0]).join("");
const well = (over: Partial<WellQuestState> = {}): WellQuestState => ({ ...emptyWellQuest(), ...over });
function stableAt(level: number): { stable: MountStable; level: number } {
  const stable = new MountStable(); stable.upgrade(level, 500, () => true, STABLE_MASTER.x, STABLE_MASTER.y); stable.train(level, STABLE_MASTER.x, STABLE_MASTER.y);
  return { stable, level };
}
const here = STABLE_MASTER;

test("guia: as oito direções, a distância em tiles e 'aqui'", () => {
  const hero = { x: 100, y: 100 }, at = (dx: number, dy: number) => ({ x: (hero.x + .5 + dx) * 32, y: (hero.y + .5 + dy) * 32 });
  const cases: Array<[number, number, string, string]> = [[10, 0, "leste", "→"], [10, 10, "sudeste", "↘"], [0, 10, "sul", "↓"], [-10, 10, "sudoeste", "↙"], [-10, 0, "oeste", "←"], [-10, -10, "noroeste", "↖"], [0, -10, "norte", "↑"], [10, -10, "nordeste", "↗"]];
  for (const [dx, dy, direction, arrow] of cases) { const guide = questGuide(hero, at(dx, dy))!; assert.equal(guide.direction, direction); assert.equal(guide.arrow, arrow); }
  assert.equal(questGuide(hero, at(12, 0))!.text, "a 12 tiles a leste");
  assert.equal(questGuide(hero, at(0, -12))!.text, "a 12 tiles ao norte");
  assert.equal(questGuide(hero, at(0, 12))!.text, "a 12 tiles ao sul");
  assert.equal(questGuide(hero, at(-12, 0))!.text, "a 12 tiles a oeste");
  assert.equal(questGuide(hero, at(7, 7))!.tiles, 10, "diagonal de 7 por 7 são cerca de 10 em linha reta");
  assert.equal(questGuide(hero, at(2, 0))!.tiles, 2); assert.equal(questGuide(hero, at(2, 0))!.direction, "leste");
  assert.equal(GUIDE_HERE_TILES, 2);
  assert.deepEqual(questGuide(hero, at(1, 0)), { tiles: 1, direction: "aqui", arrow: "●", text: "você está aqui" }, "a 1 tile já está aqui: o guia nunca fala em um tile só");
  assert.equal(questGuide(hero, at(0, 0))!.text, "você está aqui");
  assert.equal(questGuide({ x: NaN, y: 0 }, at(1, 1)), null); assert.equal(questGuide(hero, { x: 0, y: Infinity }), null);
});

test("clareira da Aela: derrotar 5 slimes, voltar a ela, e só então concluída", () => {
  const cave = { x: 1000, y: 500 };
  const fresh = clearingEntry(0, false, cave);
  assert.equal(fresh.status, "active"); assert.equal(states(fresh), "ct"); assert.equal(fresh.percent, 0); assert.match(fresh.steps[0]!.text, /\(0\/5\)/);
  assert.deepEqual(fresh.steps[0]!.place, { x: 1000, y: 500, label: "a entrada da Gruta dos Slimes" }, "a etapa atual aponta a gruta");
  assert.equal(fresh.steps[1]!.place, undefined, "etapa futura não aponta lugar");
  const half = clearingEntry(3, false); assert.match(half.steps[0]!.text, /\(3\/5\)/); assert.equal(half.percent, 48); assert.equal(half.steps[0]!.place, undefined, "sem a gruta, sem guia");
  assert.equal(clearingEntry(5, false, cave).steps[0]!.place, undefined, "a gruta já foi feita: a etapa concluída não aponta lugar");
  const claim = clearingEntry(5, false);
  assert.equal(claim.status, "active", "derrotou os 5 mas ainda não recebeu: segue em andamento"); assert.equal(states(claim), "dc"); assert.equal(claim.percent, 80);
  assert.equal(claim.steps[1]!.place!.label, "Aela, na clareira da vila"); assert.match(claim.steps[1]!.text, /2 poções de cura/);
  const done = clearingEntry(5, true);
  assert.equal(done.status, "completed"); assert.equal(states(done), "dd"); assert.equal(done.percent, 100); assert.equal(done.reward, "2 poções de cura");
  assert.equal(clearingEntry(99, true).steps[0]!.text.includes("(5/5)"), true, "mortes além do limite não passam de 5");
});

test("Garrano (Eron): o que falta para começar, as cinco etapas com a atual explicada e onde, e a missão concluída", () => {
  const novice = warhorseEntry(new MountStable().view(0), 3);
  assert.equal(novice.status, "available"); assert.equal(states(novice), "cttt"); assert.equal(novice.percent, 0);
  assert.match(novice.steps[0]!.text, /nível 15 \(você está no nível 3\)/); assert.equal(novice.steps[0]!.place!.label, "Eron, no estábulo da vila");
  const level15 = warhorseEntry(new MountStable().view(0), 15); assert.equal(states(level15), "dcttt".slice(0, 4), "só o nível feito: o cercado é o próximo"); assert.equal(level15.percent, 25);
  const trained = stableAt(15); const ready = warhorseEntry(trained.stable.view(0), 15);
  assert.equal(states(ready), "dddc", "tudo pronto: só falta pedir a missão a Eron"); assert.equal(ready.percent, 75); assert.match(ready.steps[3]!.text, /pedir a missão/);
  assert.equal(trained.stable.beginWarhorse(15, here.x, here.y, 0), "quest-started");
  const steps = MOUNT_QUESTS.warhorse.steps;
  let entry = warhorseEntry(trained.stable.view(0), 15);
  assert.equal(entry.status, "active"); assert.equal(states(entry), "ctttt"); assert.equal(entry.percent, 0);
  assert.equal(entry.steps[0]!.text, steps[0]!.hint); assert.deepEqual(entry.steps[0]!.place, { x: WILD_HOOFPRINTS.x, y: WILD_HOOFPRINTS.y, label: "as marcas de cascos" });
  assert.equal(trained.stable.inspectTracks(WILD_HOOFPRINTS.x, WILD_HOOFPRINTS.y), "tracks-found");
  entry = warhorseEntry(trained.stable.view(2), 15);
  assert.deepEqual(entry.steps.map(step => step.place === undefined), [true, true, true, true, true], "etapa feita, atual (derrotar slimes) e futuras: nenhuma aponta lugar");
  assert.equal(states(entry), "dcttt"); assert.equal(entry.percent, 20); assert.match(entry.steps[1]!.text, /\(2\/5\)/, "a etapa atual mostra a contagem"); assert.equal(entry.steps[1]!.place, undefined, "derrotar slimes não tem lugar");
  entry = warhorseEntry(trained.stable.view(5), 15);
  assert.equal(states(entry), "ddctt"); assert.deepEqual(entry.steps[2]!.place, { x: STABLE_MASTER.x, y: STABLE_MASTER.y, label: "Eron, no estábulo da vila" });
  assert.equal(trained.stable.craftHalter(10, () => true, here.x, here.y), "halter-made");
  entry = warhorseEntry(trained.stable.view(5), 15);
  assert.equal(states(entry), "dddct"); assert.deepEqual(entry.steps[3]!.place, { x: WILD_WARHORSE.x, y: WILD_WARHORSE.y, label: "o garrano" });
  assert.equal(trained.stable.tame(15, 5, WILD_WARHORSE.x, WILD_WARHORSE.y), "calmed");
  entry = warhorseEntry(trained.stable.view(5), 15); assert.equal(states(entry), "ddddc"); assert.equal(entry.percent, 80);
  assert.equal(trained.stable.returnWarhorse(here.x, here.y), "returned");
  const done = warhorseEntry(trained.stable.view(5), 15);
  assert.equal(done.status, "completed"); assert.equal(states(done), "ddddd"); assert.equal(done.percent, 100); assert.equal(done.reward, "Cavalo de Batalha e Sela de Couro Simples");
  assert.equal(done.steps.every(step => step.place === undefined), true, "concluída não aponta lugar");
  void experienceForLevel;
});

test("Água Escura: disponível, em andamento por etapas (com a próxima testemunha) e concluída", () => {
  const fresh = wellEntry(well());
  assert.equal(fresh.status, "available"); assert.equal(states(fresh), "ctt" + "t"); assert.equal(fresh.percent, 0);
  assert.equal(fresh.steps[0]!.place!.label, "Gorrak", "a primeira testemunha");
  const second = wellEntry(well({ heard: ["south-gorrak"] }));
  assert.equal(second.status, "active"); assert.match(second.steps[0]!.text, /\(1\/3\)/); assert.equal(second.steps[0]!.place!.label, "Khemet");
  const all = wellEntry(well({ heard: ["south-gorrak", "south-khemet", "south-sylrael"] }));
  assert.equal(states(all), "dctt"); assert.equal(all.steps[1]!.place!.label, "a placa do poço");
  const inspected = wellEntry(well({ heard: ["south-gorrak", "south-khemet", "south-sylrael"], inspected: true }));
  assert.equal(states(inspected), "ddct"); assert.equal(inspected.steps[2]!.place!.label, "Ixtal"); assert.match(inspected.steps[2]!.text, /Gosma Tóxica/);
  const analyzed = wellEntry(well({ heard: ["south-gorrak", "south-khemet", "south-sylrael"], inspected: true, analyzed: true }));
  assert.equal(states(analyzed), "dddc"); assert.equal(analyzed.steps[3]!.place!.label, "Gorrak");
  const done = wellEntry(well({ heard: ["south-gorrak", "south-khemet", "south-sylrael"], inspected: true, analyzed: true, reported: true }));
  assert.equal(done.status, "completed"); assert.equal(states(done), "dddd"); assert.equal(done.reward, "150 Terrania Gold");
});

test("os percentuais da Água Escura continuam os de sempre (os do resumo do painel antigo)", () => {
  const three = ["south-gorrak", "south-khemet", "south-sylrael"] as const;
  for (const state of [well(), well({ heard: ["south-gorrak"] }), well({ heard: [...three.slice(0, 2)] }), well({ heard: [...three] }), well({ heard: [...three], inspected: true }), well({ heard: [...three], inspected: true, analyzed: true }), well({ heard: [...three], inspected: true, analyzed: true, reported: true })] as WellQuestState[])
    assert.equal(wellEntry(state).percent, wellQuestSummary(state).percent, JSON.stringify(state));
});

const sources = (over: Partial<JournalSources> = {}): JournalSources => ({ trainingKills: 0, clearingRewardClaimed: false, mounts: new MountStable().view(0), level: 1, well: well(), roots: emptyRootsQuest(), ...over });

test("o diário junta as quatro missões: em andamento primeiro, depois as que dá para começar, por fim as concluídas", () => {
  const start = buildJournal(sources());
  assert.deepEqual(start.map(entry => [entry.id, entry.status]), [["clearing", "active"], ["roots", "available"], ["warhorse", "available"], ["well", "available"]]);
  const mid = buildJournal(sources({ trainingKills: 5, clearingRewardClaimed: true, well: well({ heard: ["south-gorrak"] }) }));
  assert.deepEqual(mid.map(entry => [entry.id, entry.status]), [["well", "active"], ["roots", "available"], ["warhorse", "available"], ["clearing", "completed"]], "a Água Escura subiu: em andamento vem antes");
  assert.equal(new Set(mid.map(entry => entry.id)).size, 4, "ids únicos");
  const all = buildJournal(sources({ trainingKills: 5, clearingRewardClaimed: true, well: well({ reported: true, heard: ["south-gorrak", "south-khemet", "south-sylrael"], inspected: true, analyzed: true }) }));
  assert.deepEqual(all.map(entry => entry.id), ["roots", "warhorse", "clearing", "well"], "disponíveis, depois as concluídas na ordem do jogo");
});

test("o painel da tela acompanha só missão em andamento: a escolhida, senão a primeira; concluída sai do painel", () => {
  const two = buildJournal(sources({ well: well({ heard: ["south-gorrak"] }) }));
  assert.equal(trackedEntry(two, null)!.id, "clearing", "sem escolha, a primeira em andamento");
  assert.equal(trackedEntry(two, "well")!.id, "well", "a escolhida em andamento");
  assert.equal(trackedEntry(two, "warhorse")!.id, "clearing", "uma que não está em andamento não pode ser acompanhada");
  assert.equal(trackedEntry(two, "nao-existe")!.id, "clearing");
  const panel = questPanel(two, null);
  assert.equal(panel.heading, "MISSÃO · +1 EM ANDAMENTO"); assert.equal(panel.title, "Proteja a clareira"); assert.equal(panel.progress, "Derrote 5 slimes na gruta (0/5)", "o painel usa a etapa curta"); assert.equal(panel.percent, 0);
  assert.equal(questPanel(two, "well").title, "A Água Escura"); assert.equal(questPanel(two, "well").percent, 17); assert.equal(questPanel(two, "well").progress, "Ouça as 3 versões (1/3)");
  const single = questPanel(buildJournal(sources()), null); assert.equal(single.heading, "MISSÃO");
  const finished = buildJournal(sources({ trainingKills: 5, clearingRewardClaimed: true }));
  assert.equal(trackedEntry(finished, "clearing"), null, "a clareira concluída não fica mais na tela");
  assert.deepEqual(questPanel(finished, "clearing"), { heading: "MISSÕES", title: "Nenhuma missão em andamento", progress: "Veja o Diário: Mochila → Missões", percent: 0 });
  assert.equal(currentStep(two[0]!)!.state, "current"); assert.equal(currentStep({ ...two[0]!, steps: [] }), null);
});

test("o painel da tela é pequeno: toda etapa atual tem uma versão curta (até 48 letras) e o diário guarda o texto inteiro", () => {
  const three = ["south-gorrak", "south-khemet", "south-sylrael"] as const;
  const stable = stableAt(15).stable; stable.beginWarhorse(15, here.x, here.y, 0);
  const all: JournalEntry[] = [];
  for (const kills of [0, 3, 5]) for (const claimed of [false, true]) all.push(clearingEntry(kills, claimed, { x: 1, y: 1 }));
  for (const level of [1, 15]) all.push(warhorseEntry(new MountStable().view(0), level), warhorseEntry(stableAt(level).stable.view(0), level));
  for (const kills of [0, 2, 5]) all.push(warhorseEntry(stable.view(kills), 15));
  for (const state of [well(), well({ heard: ["south-gorrak"] }), well({ heard: [...three] }), well({ heard: [...three], inspected: true }), well({ heard: [...three], inspected: true, analyzed: true })]) all.push(wellEntry(state));
  for (const roots of [emptyRootsQuest(), { accepted: true, bossDown: false, reported: false }, { accepted: true, bossDown: true, reported: false }]) for (const clearingDone of [false, true]) all.push(rootsEntry(roots, clearingDone, { x: 1, y: 1 }));
  let checked = 0;
  for (const entry of all) for (const step of entry.steps) {
    if (entry.status === "completed") continue;
    assert.ok(step.short && step.short.length <= 48, `${entry.id}: "${step.short}" (${step.short?.length})`);
    assert.ok(step.text.length > step.short.length, `${entry.id}: o texto inteiro é maior que o curto`);
    checked++;
  }
  assert.ok(checked > 40, `conferiu ${checked} etapas`);
  const panel = (entry: JournalEntry) => questPanel([entry], null).progress;
  assert.equal(panel(warhorseEntry(stable.view(0), 15)), "Examine as marcas de cascos (oeste da vila)");
  assert.equal(panel(warhorseEntry(stable.view(0), 15)).length <= 48, true);
  stable.inspectTracks(WILD_HOOFPRINTS.x, WILD_HOOFPRINTS.y);
  assert.equal(panel(warhorseEntry(stable.view(2), 15)), "Derrote 5 slimes (2/5)", "a contagem vai no painel");
  assert.equal(panel(warhorseEntry(stable.view(5), 15)), "Fale com Eron: cabresto (3 gel)");
  assert.equal(currentStep(warhorseEntry(new MountStable().view(0), 3))!.short, "Chegue ao nível 15", "as que dá para começar não vão ao painel, mas têm a versão curta");
  assert.equal(panel(wellEntry(well({ heard: [...three] }))), "Examine a placa do poço");
  assert.equal(panel(wellEntry(well({ heard: [...three], inspected: true }))), "Leve Gosma Tóxica a Ixtal");
  assert.equal(panel(wellEntry(well({ heard: [...three], inspected: true, analyzed: true }))), "Conte tudo a Gorrak");
  assert.equal(panel(clearingEntry(5, false)), "Volte a falar com a Aela");
  assert.equal(questPanel([{ ...clearingEntry(0, false), steps: [{ text: "texto inteiro sem versão curta", state: "current" }] }], null).progress, "texto inteiro sem versão curta", "sem versão curta, o painel usa o texto inteiro");
});

test("a ligação: o jogo alimenta o diário, a tela mostra a aba Missões e o painel antigo (que ficava para sempre) acabou", () => {
  const game = readFileSync("src/game/Game.ts", "utf8"), hud = readFileSync("src/app/hud.service.ts", "utf8"), html = readFileSync("src/app/game-page.html", "utf8"), ui = readFileSync("src/ui/GameUi.ts", "utf8");
  assert.match(game, /this\.hud\.updateJournal\(buildJournal\(\{/);
  assert.match(game, /clearingRewardClaimed: inventory\.questRewardClaimed/); assert.match(game, /level: levelForExperience\(this\.sim\.experience\)/); assert.match(game, /well: this\.sim\.well\.view/);
  assert.match(ui, /updateJournal\(entries: readonly JournalEntry\[\]\): void;/); assert.match(ui, /updateHero\(hero: HeroHudState\): void;/);
  assert.doesNotMatch(hud, /Clareira protegida|Missão concluída ✓|Proteja a clareira/, "o painel não guarda mais missão concluída nem a clareira fixa");
  assert.match(hud, /const panel = questPanel\(entries, this\.trackedQuestId\(\)\);/);
  assert.match(hud, /trackQuest\(id: string\): void \{ this\.trackedQuestId\.set\(id\); this\.updateJournal\(this\.journal\(\)\); \}/);
  assert.match(hud, /type InventoryTab = 'bag' \| 'equipment' \| 'map' \| 'quests';/);
  for (const id of ["inventoryTabQuests", "questJournal", "questJournalTitle"]) assert.match(html, new RegExp(`id="${id}"`), id);
  assert.match(html, /hud\.inventoryTab\(\) === 'quests'/); assert.match(html, /hud\.questHeading\(\)/); assert.doesNotMatch(html, /MISSÃO DA CLAREIRA/);
  assert.match(html, /hud\.inventoryTab\(\) === 'map' \|\| hud\.inventoryTab\(\) === 'quests'/, "a aba Missões esconde as colunas da mochila");
  assert.match(html, /\(click\)="hud\.trackQuest\(entry\.id\)"/); assert.match(html, /stepGuide\(place\)/);
  assert.match(readFileSync("src/app/game-page.component.ts", "utf8"), /stepGuide\(place: \{ x: number; y: number \}\): QuestGuide \| null \{ return questGuide\(this\.hud\.mapTile\(\), place\); \}/);
});

test("as dicas da missão do Garrano estão em linguagem simples: dizem o que é o garrano, o que fazer, onde e a tecla", () => {
  const [tracks, slimes, halter, calm, ret] = MOUNT_QUESTS.warhorse.steps.map(step => step.hint);
  assert.match(tracks!, /marcas de cascos no chão, na saída oeste da vila/); assert.match(tracks!, /tecla E/); assert.match(tracks!, /garrano, o cavalo de batalha que fugiu/);
  assert.match(slimes!, /Derrote 5 slimes/); assert.match(halter!, /Fale com Eron no estábulo/); assert.match(halter!, /3 gel/);
  assert.match(calm!, /garrano no bosque a oeste/); assert.match(calm!, /maçã doce/); assert.match(calm!, /tecla E/);
  assert.match(ret!, /fale com Eron/i);
  const messages = readFileSync("src/game/messages/mountMessages.ts", "utf8");
  assert.match(messages, /Diário de Missões \(Mochila → Missões\)/); assert.match(messages, /elas levam ao garrano, o cavalo que fugiu/);
});
