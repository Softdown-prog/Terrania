import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { NPCS, NPC_CHARACTERS, NPC_LOOKS, NPC_TALK_RANGE, npcDialogue, nearestNpc } from "../src/npcs/catalog.ts";
import { NPCS as legacyNPCS, npcDialogue as legacyDialogue } from "../src/world/npcs.ts";
import { CENTER_NPCS, CENTER_NPC_LOOKS } from "../src/npcs/center/index.ts";
import { BUILDINGS, SIGNS } from "../src/world/village.ts";

test("NPCs: cinco personagens únicos na vila central, sem NPCs inventados nas outras regiões",()=>{
  assert.equal(NPC_TALK_RANGE,82);
  assert.deepEqual(NPC_CHARACTERS.map(n=>n.id),["aela","mira","toren","lina","stablemaster"]);
  assert.deepEqual(NPC_CHARACTERS.map(n=>[n.x,n.y]),[[80,-16],[304,16],[538,32],[448,250],[384,112]]);
  assert.equal(new Set(NPC_CHARACTERS.map(n=>n.id)).size,5);
  assert.strictEqual(NPC_CHARACTERS,CENTER_NPCS);
  assert.strictEqual(NPC_LOOKS,CENTER_NPC_LOOKS);
  assert.deepEqual(Object.keys(NPC_LOOKS),["aela","mira","toren","lina"]);
  for(const region of ["north","south","east","west"])
    assert.deepEqual(readdirSync("src/npcs/"+region),["README.md"]);
});
test("NPCs: cada personagem tem ficha única e objetos de vila mantêm ordem",()=>{
  const files=readdirSync("src/npcs/center").filter(f=>f.endsWith(".ts")&&f!=="index.ts").sort();
  assert.deepEqual(files,["aela.ts","eron.ts","lina.ts","mira.ts","toren.ts"]);
  assert.strictEqual(NPCS,legacyNPCS);
  assert.equal(NPCS.length,5+SIGNS.length+BUILDINGS.length);
  assert.deepEqual(NPCS.slice(0,5),NPC_CHARACTERS);
  assert.equal(NPCS[5]?.kind,"sign");
  assert.equal(NPCS[NPCS.length-1]?.kind,"door");
  assert.equal(nearestNpc(16,16)?.id,"aela");
  assert.equal(nearestNpc(Number.NaN,0),null);
  assert.equal(nearestNpc(Infinity,0),null);
  assert.equal(nearestNpc(80+NPC_TALK_RANGE+.01,-16),null);
});
test("NPCs: diálogo central, missão, comércio, estábulo e placas preservados",()=>{
  const npc=(id:string)=>NPCS.find(n=>n.id===id)!;
  for(const kills of [0,2,5,999,Number.NaN])for(const n of NPCS)
    for(const forge of [true,false])
      assert.deepEqual(npcDialogue(n,kills,forge),legacyDialogue(n,kills,forge));
  assert.match(npcDialogue(npc("aela"),2).join(" "),/2 de 5/);
  assert.match(npcDialogue(npc("toren"),2,true).join(" "),/trocar por uma espada/i);
  assert.match(npcDialogue(npc("stablemaster"),0).join(" "),/Maçã Silvestre Doce/i);
  assert.match(npcDialogue(npc("entrance"),0).join(" "),/bem-vindo/i);
  assert.match(npcDialogue(npc("forge"),0).join(" "),/Use E perto da porta/i);
});
test("NPCs: Docker do backend empacota src/npcs",()=>{
  assert.match(readFileSync("server/Dockerfile","utf8"),/COPY src\/npcs \/work\/src\/npcs/);
});
