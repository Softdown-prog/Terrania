import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CAPITAL, CAPITAL_BUILDINGS, CAPITAL_MONUMENT, CAPITAL_TILE, capitalPoint, insideCapital, isCapitalStreet } from "../src/world/center/capital/index.ts";
import { CAPITAL_CITIZENS, CITIZEN_PATROLS } from "../src/npcs/center/capital/index.ts";
import { CAPITAL_CITIZEN_DIALOGUES, CAPITAL_CITIZEN_LOOKS } from "../src/npcs/center/capital/citizens/index.ts";
import { NPCS, NPC_LOOKS, nearestNpc, npcDialogue, npcPositionAt } from "../src/world/npcs.ts";

/** Moradores que andam pelas ruas da capital (ADR 0108): gente na cidade, só rua, sem função de jogo. */
const PERIOD = 2 * Math.PI / .35;
const times = (): number[] => Array.from({ length: Math.ceil(PERIOD / .1) + 1 }, (_, i) => i * .1);
const tileOf = (p: { x: number; y: number }): { lx: number; ly: number } => ({ lx: Math.floor(p.x / CAPITAL_TILE) - CAPITAL.centerX, ly: Math.floor(p.y / CAPITAL_TILE) - CAPITAL.centerY });

test("são oito moradores, cada um com nome, papel, aparência e falas, ids únicos, e todos estão na lista de NPCs do jogo", () => {
  assert.equal(CAPITAL_CITIZENS.length, 8);
  assert.equal(new Set(NPCS.map(n => n.id)).size, NPCS.length, "ids únicos no jogo todo");
  assert.equal(new Set(CAPITAL_CITIZENS.map(n => n.name)).size, 8, "nomes diferentes");
  for (const npc of CAPITAL_CITIZENS) {
    assert.match(npc.id, /^capital-morador-[a-z]+$/); assert.equal(npc.kind, "character"); assert.ok(NPCS.includes(npc));
    assert.ok(npc.name.length >= 3 && npc.role.length >= 3, npc.id);
    assert.ok(CAPITAL_CITIZEN_LOOKS[npc.id] && NPC_LOOKS[npc.id] === CAPITAL_CITIZEN_LOOKS[npc.id], npc.id + " tem aparência");
    const lines = CAPITAL_CITIZEN_DIALOGUES[npc.id]!;
    assert.ok(lines.length >= 2 && lines.every(line => line.length >= 30 && line.length <= 240), npc.id + " tem falas");
    assert.ok(CITIZEN_PATROLS[npc.id], npc.id + " tem rota");
  }
  assert.ok(new Set(CAPITAL_CITIZENS.map(n => n.role)).size >= 7, "papéis variados");
});

test("a rota de cada morador, em um ciclo inteiro de passos, fica só em rua da capital, longe do monumento e dos edifícios, dentro da muralha", () => {
  const center = capitalPoint(0, 0);
  for (const npc of CAPITAL_CITIZENS) for (const t of times()) {
    const at = npcPositionAt(npc, t), { lx, ly } = tileOf(at);
    assert.ok(insideCapital(lx, ly) && isCapitalStreet(lx, ly), `${npc.name} em ${lx},${ly} (t=${t.toFixed(1)}) fora da rua`);
    assert.ok(Math.hypot(at.x - center.x, at.y - center.y) > CAPITAL_MONUMENT.radiusTiles * CAPITAL_TILE + 16, `${npc.name} em cima do monumento`);
    for (const b of CAPITAL_BUILDINGS) assert.ok(!(at.x > b.x - b.width / 2 && at.x < b.x + b.width / 2 && at.y > b.y - b.depth && at.y < b.y), `${npc.name} dentro de ${b.id}`);
  }
});

test("eles andam de verdade: vão e voltam por todo o trajeto da rota, param nas pontas e não andam todos juntos", () => {
  for (const npc of CAPITAL_CITIZENS) {
    const patrol = CITIZEN_PATROLS[npc.id]!, xs = times().map(t => npcPositionAt(npc, t).x), ys = times().map(t => npcPositionAt(npc, t).y);
    const spanX = Math.max(...xs) - Math.min(...xs), spanY = Math.max(...ys) - Math.min(...ys);
    assert.ok(Math.abs(spanX - 2 * patrol.x * CAPITAL_TILE) < 6 && Math.abs(spanY - 2 * patrol.y * CAPITAL_TILE) < 6, `${npc.name}: percorre ${spanX.toFixed(0)} × ${spanY.toFixed(0)} px`);
    assert.ok(patrol.x > 0 || patrol.y > 0, npc.name + " anda");
    assert.ok(Math.max(patrol.x, patrol.y) >= 2 && Math.max(patrol.x, patrol.y) <= 8, `${npc.name}: rota de ${Math.max(patrol.x, patrol.y)} tiles para cada lado`);
    const walking = times().map(t => npcPositionAt(npc, t).walking);
    assert.ok(walking.includes(true) && walking.includes(false), npc.name + " anda e para");
  }
  assert.ok(new Set(CAPITAL_CITIZENS.map(n => CITIZEN_PATROLS[n.id]!.phase)).size === 8, "fases diferentes");
  const at0 = CAPITAL_CITIZENS.map(n => Math.round(Math.hypot(npcPositionAt(n, 5).x - n.x, npcPositionAt(n, 5).y - n.y)));
  assert.ok(new Set(at0).size >= 6, "no mesmo instante cada um está num ponto diferente da sua rota");
});

test("a fase só vale para quem a tem: Mira, Toren, Lina e os outros de antes andam exatamente como andavam", () => {
  for (const id of ["mira", "toren", "lina", "south-hesh", "south-zinha"]) {
    const npc = NPCS.find(n => n.id === id)!, at = npcPositionAt(npc, 3.2), phase = 3.2 * .35;
    const route = { mira: [65, 0], toren: [35, 0], lina: [0, 36], "south-hesh": [48, 0], "south-zinha": [22, 0] }[id]!;
    assert.ok(Math.abs(at.x - (npc.x + route[0]! * Math.sin(phase))) < 1e-9 && Math.abs(at.y - (npc.y + route[1]! * Math.sin(phase))) < 1e-9, id);
  }
  const aela = NPCS.find(n => n.id === "aela")!;
  assert.deepEqual(npcPositionAt(aela, 9), { x: aela.x, y: aela.y, walking: false }, "Aela segue fixa");
});

test("dá para conversar: perto do morador no ponto de partida o jogo o escolhe e traz as falas dele; longe, não", () => {
  const tome = CAPITAL_CITIZENS.find(n => n.name === "Tomé")!;
  assert.deepEqual(npcPositionAt(tome, 0), { x: tome.x, y: tome.y, walking: true }, "a fase 0 começa no ponto de origem");
  assert.equal(nearestNpc(tome.x, tome.y + 20, 0)?.id, tome.id);
  assert.deepEqual(npcDialogue(tome, 0), CAPITAL_CITIZEN_DIALOGUES[tome.id]);
  const far = npcPositionAt(tome, 4.5);
  assert.ok(Math.hypot(far.x - tome.x, far.y - tome.y) > 150, "a 4,5 s ele já andou mais de 150 px");
  assert.notEqual(nearestNpc(tome.x, tome.y + 20, 4.5)?.id, tome.id, "com ele longe, não conversa");
});

test("as rotas e a fase vêm de um lugar só e o catálogo as junta às dos outros", () => {
  const catalog = readFileSync("src/npcs/catalog.ts", "utf8");
  assert.match(catalog, /\.\.\.Object\.fromEntries\(Object\.entries\(CITIZEN_PATROLS\)\.map\(\(\[id, p\]\) => \[id, \{ x: p\.x \* TILE_PX, y: p\.y \* TILE_PX, phase: p\.phase \}\]\)\)/);
  assert.match(catalog, /const phase = Math\.max\(0, time\) \* \.35 \+ \(route\.phase \?\? 0\);/);
});
